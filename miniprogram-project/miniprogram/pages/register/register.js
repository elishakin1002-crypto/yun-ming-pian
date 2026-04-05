const PHONE_REGEX = /^1[3-9]\d{9}$/

function getCreatedCardId(result) {
  if (!result || typeof result !== 'object') return ''
  return result._id || result.id || result.enterpriseId || ''
}

function isCreateSuccess(result) {
  if (!result || typeof result !== 'object') return false
  if (result.success === true) return true
  return !!getCreatedCardId(result)
}

Page({
  data: {
    step: 1,
    logoUrl: '',
    industries: ['互联网/IT', '金融/投资', '教育/培训', '医疗/健康', '制造/工业', '房地产/建筑', '零售/批发', '服务业', '其他'],
    industryIndex: 0,
    isSubmitting: false,
    isSaving: false,
    isEdit: false,
    cardRole: 'brand',
    cardStyle: 'classic',
    formData: {
      contactName: '',
      companyName: '',
      title: '',
      phone: '',
      wechat: '',
      cardName: '',
      bio: '',
      service1: '',
      service2: '',
      service3: '',
      slogan: ''
    }
  },

  onLoad(options) {
    // If editing existing card, store editId and pre-fill
    if (options.edit === 'true' && options.id) {
      this.editId = options.id
      this.setData({ isEdit: true })
      this.loadCard(options.id)
      wx.setNavigationBarTitle({ title: '编辑名片' })
    }
    wx.requirePrivacyAuthorize({
      success: () => {}
    })
  },

  loadCard(id) {
    wx.cloud.database().collection('enterprises').doc(id).get()
      .then(res => {
        const d = res.data
        this.setData({
          logoUrl: d.logoUrl || '',
          cardRole: d.cardRole || 'brand',
          cardStyle: d.cardStyle || 'classic',
          industryIndex: this.data.industries.indexOf(d.industry) >= 0 ? this.data.industries.indexOf(d.industry) : 0,
          'formData.contactName': d.contactName || '',
          'formData.companyName': d.companyName || '',
          'formData.title': d.title || '',
          'formData.phone': d.phone || '',
          'formData.wechat': d.wechat || '',
          'formData.cardName': d.cardName || '',
          'formData.bio': d.bio || '',
          'formData.service1': d.services && d.services[0] || '',
          'formData.service2': d.services && d.services[1] || '',
          'formData.service3': d.services && d.services[2] || '',
          'formData.slogan': d.slogan || ''
        })
      })
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`formData.${key}`]: e.detail.value })
  },

  /* Step navigation */
  nextStep() {
    const { step, formData, logoUrl } = this.data
    if (step === 1) {
      if (!formData.contactName.trim()) {
        return wx.showToast({ title: '请填写姓名', icon: 'none' })
      }
      if (!formData.phone || !PHONE_REGEX.test(formData.phone)) {
        return wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      }
    }
    if (step < 3) {
      this.setData({ step: step + 1 })
    }
  },

  prevStep() {
    if (this.data.step > 1) {
      this.setData({ step: this.data.step - 1 })
    }
  },

  pickRole(e) {
    this.setData({ cardRole: e.currentTarget.dataset.role })
    if (this.data.isEdit) {
      wx.showToast({ title: '已选择，记得保存', icon: 'none', duration: 1500 })
    }
  },

  pickStyle(e) {
    this.setData({ cardStyle: e.currentTarget.dataset.style })
    if (this.data.isEdit) {
      wx.showToast({ title: '已选择，记得保存', icon: 'none', duration: 1500 })
    }
  },

  quickSave() {
    if (!this.editId || this.data.isSaving) return
    const { cardRole, cardStyle } = this.data
    this.setData({ isSaving: true })
    wx.showLoading({ title: '保存中' })
    wx.cloud.callFunction({
      name: 'updateEnterprise',
      data: { enterpriseId: this.editId, data: { cardRole, cardStyle } },
      success: res => {
        wx.hideLoading()
        this.setData({ isSaving: false })
        if (res.result && res.result.success) {
          wx.showToast({ title: '风格已保存', icon: 'success' })
          setTimeout(() => wx.navigateBack({ delta: 1 }), 1200)
        } else {
          wx.showToast({ title: res.result?.error || '保存失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        this.setData({ isSaving: false })
        wx.showToast({ title: '网络异常，请重试', icon: 'none' })
      }
    })
  },

  onIndustryChange(e) {
    this.setData({ industryIndex: e.detail.value })
  },

  /* ====== 微信快捷填充 ====== */

  // 微信头像选择器回调
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    if (!avatarUrl) return
    // 将微信头像上传到云存储
    wx.showLoading({ title: '获取中...' })
    const cloudPath = `logos/${Date.now()}-wx-avatar.jpg`
    wx.cloud.uploadFile({
      cloudPath,
      filePath: avatarUrl,
      success: fileRes => {
        this.setData({ logoUrl: fileRes.fileID })
        wx.hideLoading()
        wx.showToast({ title: '头像已获取', icon: 'success' })
      },
      fail: () => {
        // 上传失败则直接使用临时路径
        this.setData({ logoUrl: avatarUrl })
        wx.hideLoading()
      }
    })
  },

  // 微信昵称填充回调
  onNicknameChange(e) {
    const nickname = e.detail.value
    if (nickname) {
      this.setData({ 'formData.contactName': nickname })
    }
  },

  // 微信手机号一键获取回调
  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') return
    // 需要云函数解密手机号
    wx.cloud.callFunction({
      name: 'getPhoneNumber',
      data: { code: e.detail.code },
      success: res => {
        const phone = res.result?.phoneNumber || res.result?.purePhoneNumber
        if (phone) {
          this.setData({ 'formData.phone': phone })
          wx.showToast({ title: '手机号已获取', icon: 'success' })
        }
      },
      fail: () => {
        wx.showToast({ title: '获取失败，请手动输入', icon: 'none' })
      }
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

        const ext = tempFilePath.split('.').pop()?.toLowerCase() || 'jpg'
        const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
        const safeExt = allowedExts.includes(ext) ? ext : 'jpg'
        const cloudPath = `logos/${Date.now()}-${Math.floor(Math.random() * 1000)}.${safeExt}`

        wx.cloud.uploadFile({
          cloudPath,
          filePath: tempFilePath,
          success: fileRes => {
            this.setData({ logoUrl: fileRes.fileID })
            wx.hideLoading()
            wx.showToast({ title: '上传成功', icon: 'success' })
          },
          fail: err => {
            wx.hideLoading()
            wx.showToast({ title: '上传失败', icon: 'none' })
            console.error('云存储上传失败:', err)
          }
        })
      }
    })
  },

  handleAgreePrivacy() {},

  onSubmit(e) {
    if (this.data.isSubmitting) return

    const { formData, logoUrl, cardRole, cardStyle, industries, industryIndex } = this.data

    // Final validation
    if (!formData.contactName.trim() || !formData.phone) {
      return wx.showToast({ title: '请填写姓名和手机号', icon: 'none' })
    }
    if (!PHONE_REGEX.test(formData.phone)) {
      return wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
    }

    const submitData = {
      contactName: formData.contactName.trim(),
      companyName: (formData.companyName || '').trim(),
      title: formData.title.trim(),
      phone: formData.phone,
      wechat: formData.wechat.trim(),
      logoUrl: logoUrl,
      industry: industries[industryIndex],
      cardRole: cardRole,
      cardStyle: cardStyle,
      cardName: formData.cardName.trim() || '我的名片'
    }

    // Growth card extras
    if (cardRole === 'growth') {
      submitData.bio = formData.bio
      submitData.slogan = formData.slogan
      submitData.services = [formData.service1, formData.service2, formData.service3]
        .map(s => (s || '').trim())
        .filter(Boolean)
    }

    this.setData({ isSubmitting: true })

    // 编辑模式：调用 updateEnterprise；新建模式：调用 registerEnterprise
    if (this.editId) {
      wx.showLoading({ title: '保存中' })
      wx.cloud.callFunction({
        name: 'updateEnterprise',
        data: { enterpriseId: this.editId, data: submitData },
        success: res => {
          wx.hideLoading()
          this.setData({ isSubmitting: false })
          if (res.result && res.result.success) {
            wx.showToast({ title: '名片已更新', icon: 'success' })
            setTimeout(() => {
              wx.switchTab({ url: '/pages/my-card/my-card' })
            }, 1000)
          } else {
            wx.showToast({ title: res.result?.error || '更新失败', icon: 'none' })
          }
        },
        fail: err => {
          wx.hideLoading()
          this.setData({ isSubmitting: false })
          wx.showToast({ title: '网络异常，请重试', icon: 'none' })
          console.error(err)
        }
      })
    } else {
      wx.showLoading({ title: '生成中' })
      wx.cloud.callFunction({
        name: 'registerEnterprise',
        data: submitData,
        success: res => {
          wx.hideLoading()
          this.setData({ isSubmitting: false })
          console.log('[register] registerEnterprise result:', res.result)
          const createdCardId = getCreatedCardId(res.result)
          if (isCreateSuccess(res.result)) {
            // 创建成功 → 引导分享（裂变关键节点）
            wx.showModal({
              title: '名片已创建',
              content: '立即发名片给客户或伙伴，开始收集客户资料。',
              confirmText: '发名片',
              cancelText: '稍后再说',
              success: (result) => {
                if (result.confirm) {
                  wx.setStorageSync('afterCreateShare', 1)
                }
                if (createdCardId) {
                  wx.setStorageSync('latestCreatedCardId', createdCardId)
                }
                wx.switchTab({ url: '/pages/my-card/my-card' })
              }
            })
          } else {
            console.error('[register] create failed with result:', res.result)
            wx.showToast({ title: res.result?.message || '创建失败', icon: 'none' })
          }
        },
        fail: err => {
          wx.hideLoading()
          this.setData({ isSubmitting: false })
          wx.showToast({ title: '网络异常，请重试', icon: 'none' })
          console.error(err)
        }
      })
    }
  }
})
