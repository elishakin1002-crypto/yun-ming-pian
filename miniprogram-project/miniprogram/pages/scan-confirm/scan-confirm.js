Page({
  data: {
    imagePath: '',
    saving: false,
    form: {
      contactName: '',
      phone: '',
      companyName: '',
      title: '',
      wechat: '',
      email: '',
      note: ''
    }
  },

  onLoad() {
    const draft = wx.getStorageSync('scanCardDraft') || {}
    console.log('[scan-confirm] received draft:', draft)
    const manualEntry = !!draft.manualEntry
    const fields = draft.fields || {}
    const hasRecognizedValue = this.hasValidFields(fields)

    if (!manualEntry && !hasRecognizedValue) {
      console.error('[scan-confirm] no valid recognized fields, block confirm page')
      wx.showToast({
        title: '未识别到有效名片信息，请更换更清晰的名片图片再试',
        icon: 'none',
        duration: 2400
      })
      setTimeout(() => {
        wx.navigateBack({ delta: 1 })
      }, 500)
      return
    }

    this.setData({
      imagePath: draft.imagePath || '',
      form: {
        ...this.data.form,
        ...fields
      }
    })
    if (manualEntry) {
      console.log('[scan-confirm] manual entry mode enabled')
    }
    console.log('[scan-confirm] form prefilled:', this.data.form)
  },

  onUnload() {
    wx.removeStorageSync('scanCardDraft')
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  hasValidFields(fields) {
    const keys = ['contactName', 'phone', 'companyName', 'title', 'wechat', 'email', 'note']
    return keys.some(key => {
      const value = (fields[key] || '').toString().trim()
      return value.length > 0
    })
  },

  saveContact() {
    if (this.data.saving) return
    const form = this.data.form
    if (!form.contactName && !form.phone && !form.companyName) {
      wx.showToast({ title: '请至少补充姓名、手机或公司', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    console.log('[scan-confirm] save request payload:', form)
    wx.cloud.callFunction({
      name: 'saveScannedContact',
      data: {
        contactName: form.contactName,
        phone: form.phone,
        companyName: form.companyName,
        title: form.title,
        wechat: form.wechat,
        email: form.email,
        note: form.note
      },
      success: res => {
        this.setData({ saving: false })
        console.log('[scan-confirm] saveScannedContact result:', res.result)
        if (res.result?.success) {
          wx.showToast({ title: '已保存', icon: 'success' })
          setTimeout(() => {
            wx.switchTab({ url: '/pages/wallet/wallet' })
          }, 600)
          return
        }
        console.error('[scan-confirm] saveScannedContact returned failure:', {
          result: res.result,
          payload: form
        })
        wx.showToast({ title: res.result?.message || '保存失败', icon: 'none' })
      },
      fail: err => {
        this.setData({ saving: false })
        console.error('[scan-confirm] saveScannedContact call failed:', {
          error: err,
          payload: form
        })
        wx.showModal({
          title: '保存失败',
          content: err?.errMsg || '调用 saveScannedContact 失败，请检查云函数是否已部署并查看控制台错误。',
          showCancel: false
        })
      }
    })
  }
})
