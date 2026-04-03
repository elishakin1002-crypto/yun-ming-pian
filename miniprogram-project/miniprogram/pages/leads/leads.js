Page({
  data: {
    leads: [],
    isLoading: true,
    hasCard: true
  },

  onShow() {
    this.loadLeads()
  },

  loadLeads() {
    this.setData({ isLoading: true })
    wx.cloud.callFunction({
      name: 'getLeads',
      success: res => {
        const { leads, hasCard } = res.result || {}
        this.setData({
          leads: leads || [],
          hasCard: hasCard !== false,
          isLoading: false
        })
      },
      fail: (err) => {
        console.error('getLeads 调用失败:', err)
        this.setData({ isLoading: false })
        wx.showToast({ title: '加载失败，请检查云函数是否部署', icon: 'none' })
      }
    })
  },

  callPhone(e) {
    const phone = e.currentTarget.dataset.phone
    if (!phone) return
    wx.makePhoneCall({ phoneNumber: phone })
  },

  copyWechat(e) {
    const wechat = e.currentTarget.dataset.wechat
    if (!wechat) {
      wx.showToast({ title: '对方未填写微信号', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: wechat,
      success: () => wx.showToast({ title: '微信号已复制', icon: 'success' })
    })
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  },

  exportLeads() {
    if (this.data.leads.length === 0) {
      wx.showToast({ title: '暂无线索可导出', icon: 'none' })
      return
    }
    wx.showLoading({ title: '导出中' })
    wx.cloud.callFunction({
      name: 'exportLeads',
      success: res => {
        wx.hideLoading()
        if (!res.result || !res.result.success) {
          wx.showToast({ title: res.result?.message || '导出失败', icon: 'none' })
          return
        }
        const fs = wx.getFileSystemManager()
        const filePath = `${wx.env.USER_DATA_PATH}/leads_export.csv`
        fs.writeFile({
          filePath,
          data: res.result.csv,
          encoding: 'utf8',
          success: () => {
            wx.shareFileMessage({
              filePath,
              fileName: 'leads_export.csv',
              success: () => wx.showToast({ title: '分享成功', icon: 'success' }),
              fail: () => {
                wx.showModal({
                  title: '导出成功',
                  content: `共导出 ${res.result.total} 条线索`,
                  showCancel: false
                })
              }
            })
          },
          fail: () => wx.showToast({ title: '文件写入失败', icon: 'none' })
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络异常', icon: 'none' })
      }
    })
  }
})
