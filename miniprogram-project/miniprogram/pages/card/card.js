Page({
  data: { enterprise: null },
  
  onLoad(options) {
    this.enterpriseId = options.id || '';
    if(this.enterpriseId) {
      this.fetchData();
      this.recordAction('views');
    }
  },

  fetchData() {
    wx.showLoading({ title: '加载中' });
    wx.cloud.database().collection('enterprises').doc(this.enterpriseId).get().then(res => {
      this.setData({ enterprise: res.data });
      wx.hideLoading();
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '获取名片失败', icon: 'none' });
    });
  },

  recordAction(action) {
    wx.cloud.callFunction({
      name: 'recordInteraction',
      data: { enterpriseId: this.enterpriseId, action }
    });
  },

  saveToAlbum() {
    this.recordAction('saves');
    wx.showToast({ title: '保存功能需结合Canvas绘制，此处为演示', icon: 'none' });
  },

  onShareAppMessage() {
    this.recordAction('forwards');
    return {
      title: `您好，这是${this.data.enterprise.companyName}的名片`,
      path: `/pages/card/card?id=${this.enterpriseId}`
    }
  }
})