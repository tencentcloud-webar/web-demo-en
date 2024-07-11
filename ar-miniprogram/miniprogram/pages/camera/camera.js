// 0.3.0及之后版本引用方式（2个文件 + 按需初始化3d模块）
import "../../miniprogram_npm/tencentcloud-webar/lib.js";
import "../../miniprogram_npm/tencentcloud-webar/core.js";
// 按需初始化3d插件，如果不需要3d则可以不引用
import "../../miniprogram_npm/tencentcloud-webar/lib-3d.js";
import { plugin3d } from "../../miniprogram_npm/tencentcloud-webar/plugin-3d";
// 导入 ArSdk
import { ArSdk } from "../../miniprogram_npm/tencentcloud-webar/index.js";
import { default as localStorage } from "../../utils/localStorage";
import sha256 from "../../utils/sha256";

/** ----- Authentication configuration ----- */

/**
 * Tencent Cloud APPID
 *
 * View the APPID at [Tencent Cloud Account Center] (https://console.tencentcloud.com/developer)
 */
const APPID = ""; // your appid;

/**
 * Web LicenseKey
 *
 * Obtain a LicenseKey by creating a project at [Web License Management] (https://console.tencentcloud.com/magic/web)
 */
const LICENSE_KEY = ""; // your licenseKey;

/**
 * This Token is the secret key used for calculating the signature.
 *
 * Obtain a Token by creating a project at [Web License Management] (https://console.tencentcloud.com/magic/web)
 */
const token = ""; // 'your token';

/** ----------------------- */
const BEAUTY_OPTION_LIST = [
  {
    name: "美白",
    key: "whiten",
  },
  {
    name: "磨皮",
    key: "dermabrasion",
  },
  {
    name: "瘦脸",
    key: "lift",
  },
  {
    name: "削脸",
    key: "shave",
  },
  {
    name: "大眼",
    key: "eye",
  },
  {
    name: "下巴",
    key: "chin",
  },
];
Page({
  /**
   * 页面的初始数据
   */
  data: {
    backBtnTop: 40, // 返回按钮位置
    beautyOptions: BEAUTY_OPTION_LIST,
    beautyValue: undefined,
    showFilter: undefined,
    showBeauty: undefined,
    showMakeup: undefined,
    showSticker: undefined,
    activeOptName: undefined,
    recordStatus: "",
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {},

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    this.init();
    this.start();
  },

  onShow: function () {},
  init() {
    this.data._beauty = {
      whiten: 0.1,
      dermabrasion: 0.5,
      lift: 0,
      shave: 0,
      eye: 0.2,
      chin: 0,
    };
    this.data._makeupId = this.data._stickerId = "none";
    this.setData({
      beautyValue: { ...this.data._beauty },
      recordStatus: "paused",
    });
  },

  async start() {
    wx.showLoading({
      title: "初始化中……",
    });

    const canvas = await this.getCanvasNode();
    const sdk = new ArSdk({
      auth: {
        authFunc: this.getSignature,
        appId: APPID,
        licenseKey: LICENSE_KEY, // 控制台默认key
      },
      camera: {
        width: 720,
        height: 1280,
      },
      output: canvas,
      beautify: this.data._beauty, // 默认美颜参数
      loading: {
        enable: true,
        lineWidth: 8,
        strokeColor: 0xffffff,
        size: 100,
      },
    });

    sdk.on("error", (error) => {
      console.log("sdk error", error);
    });
    this.sdk = sdk;
    // 需在created回调中获取素材信息
    sdk.on("created", async (_) => {
      await this.preloadResources();
      wx.hideLoading();
    });
  },

  /**
   * 定义获取签名方法
   *
   * 注意：签名方法推荐在服务端实现，通过接口提供，前端调用拉取签名，此处为了帮助您快速跑通所以在前端计算签名
   * 如：
   * getSignature(){
   *   return new Promise((resolve,reject)=>{
   *     wx.request({
   *       url: 'https://xxx.com/get-ar-sign',
   *       method: 'GET',
   *       success(res) {
   *         console.log('getSignature ok', res)
   *          resolve(res.data);
   *       },
   *       fail(e){
   *         console.log('getSignature error', e)
   *       }
   *     })
   *   })
   * },
   */
  getSignature() {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = sha256(
      timestamp + token + APPID + timestamp
    ).toUpperCase();
    return { signature, timestamp };
  },

  async getCanvasNode() {
    return new Promise((resolve) => {
      this.createSelectorQuery()
        .select("#main-canvas")
        .node()
        .exec((res) => {
          const canvasNode = res[0].node;
          resolve(canvasNode);
        });
    });
  },

  onClickRecord() {
    if (this.data.recordStatus !== "recording") {
      this.startRecord();
    } else {
      this.stopRecord();
    }
  },
  async stopRecord() {
    wx.showLoading({
      title: "视频处理中",
    });
    const result = await this.sdk.stopRecord();
    this.setData({
      recordStatus: "paused",
    });
    console.log("导出result", result);
    const { tempFilePath } = result;
    wx.hideLoading();
    wx.navigateTo({
      url: `../export/export?file=${tempFilePath}`,
    });
  },

  async startRecord() {
    await this.sdk.startRecord();
    this.setData({
      recordStatus: "recording",
    });
  },
  onClickFilterIcon() {
    this.setData({
      showFilter: true,
      activeOptName: "showFilter",
    });
  },
  onClickBeautyIcon() {
    this.setData({
      showBeauty: true,
      activeOptName: "showBeauty",
    });
  },
  onClickMakeupIcon() {
    this.setData({
      showMakeup: true,
      activeOptName: "showMakeup",
    });
  },
  onClickStickerIcon() {
    this.setData({
      showSticker: true,
      activeOptName: "showSticker",
    });
  },
  // 遮罩层点击事件
  onClickMask() {
    this.setData({
      [this.data.activeOptName]: false,
    });
  },
  preloadResources() {
    const getFilterList = () => {
      return new Promise(async (resolve, reject) => {
        let cache = localStorage.getItem("filter"); // 简单的缓存策略，避免每次都调用接口，根据自身业务需求调整
        if (!cache) {
          const filterList = await this.sdk.getCommonFilter(); // 通过sdk的getCommonFilter接口获取内置滤镜
          cache = filterList.map((f) => {
            return {
              name: f.Name,
              previewImage: f.CoverUrl,
              key: "filter-" + f.EffectId,
              weight: f.Weight,
            };
          });
          localStorage.setItem("filter", cache);
        }
        cache.sort((a, b) => b.weight - a.weight);
        cache.unshift({
          key: "none",
          name: "无",
          selected: true,
          previewImage:
            "https://webar-static.tencent-cloud.com/assets/icon/none.png",
        });
        this.setData({
          filterList: cache,
        });
        resolve(cache);
      });
    };
    const getEffectList = () => {
      return new Promise(async (resolve, reject) => {
        let cache = localStorage.getItem("effect");
        if (!cache) {
          // 获取内置美妆、贴纸列表
          const effectList = await this.sdk.getEffectList({
            Type: "Preset",
          });
          cache = effectList.map((f) => {
            return {
              name: f.Name,
              previewImage: f.CoverUrl,
              key: "effect-" + f.EffectId,
              label: f.Label,
              weight: f.Weight,
            };
          });
          localStorage.setItem("effect", cache);
        }
        // console.log('cache',cache)
        const makeupList = cache.filter(
          (item) => item.label.indexOf("美妆") >= 0
        );
        const stickerList = cache.filter(
          (item) => item.label.indexOf("贴纸") >= 0
        );
        // makeupList.sort((a,b)=>b.weight-a.weight)
        makeupList.unshift({
          key: "none",
          name: "无",
          selected: true,
          previewImage:
            "https://webar-static.tencent-cloud.com/assets/icon/none.png",
        });
        // stickerList.sort((a,b)=>b.weight-a.weight)
        stickerList.unshift({
          key: "none",
          name: "无",
          selected: true,
          previewImage:
            "https://webar-static.tencent-cloud.com/assets/icon/none.png",
        });
        this.setData({
          makeupList,
          stickerList,
        });
        resolve(cache);
      });
    };
    Promise.all([getFilterList(), getEffectList()]).then(() => {
      console.log("preloadResources success");
    });
  },
  onChangeFilter(e) {
    let { id } = e.detail;
    if (id === "none") {
      this.sdk.setFilter("", 0); // 清空滤镜效果
      return;
    }
    const parts = id.split("-");
    parts.shift();
    id = parts.join("-");
    this.sdk.setFilter(id);
  },
  onChangeMakeup(e) {
    let { id } = e.detail;
    if (id === "none") {
      this.data._makeupId = "none";
      this.sdk.setEffect(
        this.data._stickerId === "none" ? [] : [this.data._stickerId]
      ); // 清空美妆效果
      return;
    }
    const parts = id.split("-");
    parts.shift();
    id = parts.join("-");
    this.data._makeupId = id;
    this.sdk.setEffect(
      this.data._stickerId === "none" ? [id] : [id, this.data._stickerId]
    );
  },
  onChangeSticker(e) {
    let { id } = e.detail;
    if (id === "none") {
      this.data._stickerId = "none";
      this.sdk.setEffect(
        this.data._makeupId === "none" ? [] : [this.data._makeupId]
      ); // 清空贴纸效果
      return;
    }
    const parts = id.split("-");
    parts.shift();
    id = parts.join("-");
    this.data._stickerId = id;
    this.sdk.setEffect(
      this.data._makeupId === "none" ? [id] : [this.data._makeupId, id]
    );
  },
  onChangeBeauty(e) {
    const key = e.currentTarget.dataset.key;
    this.data._beauty[key] = e.detail.value / 100; // 数据归一化
    this.sdk.setBeautify(this.data._beauty);
  },
  onUnload() {
    console.log("onUnload");
    this.sdk && this.sdk.destroy();
  },
});
