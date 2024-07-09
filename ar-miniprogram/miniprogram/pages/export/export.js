// pages/export/export.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    file: '',
    backBtnTop: 40
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      file: options.file,
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },
  onClickExport(){
    wx.saveVideoToPhotosAlbum({
      filePath: this.data.file,
      success:() => {
        wx.showToast({
          title: "导出成功！"
        });
        setTimeout(_=>{
          wx.navigateBack({
            delta: 2
          })
        },1000)
      }
    })
  },
  goBack() {
    wx.showModal({
      title: '提示',
      content: '返回将丢失当前拍摄效果，确定返回？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },
})