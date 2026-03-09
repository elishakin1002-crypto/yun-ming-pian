Page({
  data: { 
    logoUrl: '',
    industries: ['互联网/IT', '金融/投资', '教育/培训', '医疗/健康', '制造/工业', '房地产/建筑', '零售/批发', '服务业', '其他'],
    industryIndex: 0
  },
  
  onLoad() {
    // 触发隐私弹窗
    wx.requirePrivacyAuthorize({
      success: () => { console.log('用户已同意隐私授权') }
    })
  },

  onIndustryChange(e) {
    this.setData({
      industryIndex: e.detail.value
    })
  },

  uploadLogo() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({ title: '上传中...' })
        
        const cloudPath = `logos/${Date.now()}-${Math.floor(Math.random()*1000)}.png`
        
        // 上传到云存储
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: fileRes => {
            this.setData({ logoUrl: fileRes.fileID })
            wx.hideLoading()
            wx.showToast({ title: '上传成功', icon: 'success' })
          },
          fail: err => {
            wx.hideLoading()
            wx.showToast({ title: '上传失败，请检查云开发配置', icon: 'none' })
            console.error('云存储上传失败:', err)
          }
        })
      },
      fail: (err) => {
        console.error('选择图片失败:', err)
      }
    })
  },
  handleAgreePrivacy() {
    // 用户同意隐私协议的回调
  },

  onSubmit(e) {
    const formData = e.detail.value
    if (!this.data.logoUrl) {
      return wx.showToast({ title: '请上传LOGO', icon: 'none' })
    }
    if (!formData.companyName || !formData.contactName || !formData.phone) {
      return wx.showToast({ title: '请填写完整信息', icon: 'none' })
    }

    formData.logoUrl = this.data.logoUrl
    formData.industry = this.data.industries[this.data.industryIndex]
    
    wx.showLoading({ title: '生成中' })
    wx.cloud.callFunction({
      name: 'registerEnterprise',
      data: formData,
      success: res => {
        wx.hideLoading()
        if(res.result && res.result._id) {
          wx.navigateTo({ url: `/pages/card/card?id=${res.result._id}` })
        } else {
          wx.showToast({ title: '注册失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        wx.showToast({ title: '云函数调用失败', icon: 'none' })
        console.error(err)
      }
    })
  }
})