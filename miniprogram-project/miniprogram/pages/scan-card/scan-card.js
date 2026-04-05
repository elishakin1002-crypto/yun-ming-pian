Page({
  data: {
    imagePath: '',
    recognizing: false,
    uploadedFileId: '',
    recognizeError: false,
    errorMessage: ''
  },

  pickFromCamera() {
    this.chooseImage(['camera'])
  },

  pickFromAlbum() {
    this.chooseImage(['album'])
  },

  chooseImage(sourceType) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType,
      success: res => {
        const imagePath = res.tempFilePaths && res.tempFilePaths[0]
        if (!imagePath) return
        console.log('[scan-card] selected image path:', imagePath)
        this.setData({
          imagePath,
          uploadedFileId: '',
          recognizeError: false,
          errorMessage: ''
        })
      }
    })
  },

  async recognizeCard() {
    if (!this.data.imagePath || this.data.recognizing) return
    this.setData({
      recognizing: true,
      recognizeError: false,
      errorMessage: ''
    })
    wx.showLoading({ title: '识别中' })

    const failAndStop = (message, error) => {
      wx.hideLoading()
      this.setData({
        recognizing: false,
        recognizeError: true,
        errorMessage: '未识别到有效名片信息，请更换更清晰的名片图片再试'
      })
      console.error('[scan-card] OCR failed:', error || message)
      wx.showToast({
        title: '未识别到有效名片信息，请更换更清晰的名片图片再试',
        icon: 'none',
        duration: 2600
      })
      if (message) {
        console.warn('[scan-card] fail reason:', message)
      }
    }

    // 调试日志：先尝试上传，确认图片可读（仅用于日志与排障）
    const uploadedFileId = await this.tryUploadForDebug(this.data.imagePath)
    if (uploadedFileId) {
      this.setData({ uploadedFileId })
      console.log('[scan-card] debug upload success fileId:', uploadedFileId)
    } else {
      console.warn('[scan-card] debug upload skipped or failed')
    }

    if (typeof wx.ocrBusinessCard !== 'function') {
      failAndStop('wx.ocrBusinessCard is not available in current runtime')
      return
    }

    try {
      wx.ocrBusinessCard({
        imgUrl: this.data.imagePath,
        imgPath: this.data.imagePath,
        success: res => {
          console.log('[scan-card] OCR raw result:', res)
          wx.hideLoading()
          this.setData({ recognizing: false })
          const rawText = this.collectText(res).join('\n')
          const fields = this.extractFields(rawText)
          console.log('[scan-card] extracted fields:', fields)

          if (!this.hasValidExtraction(fields)) {
            failAndStop('OCR returned but no valid business card fields extracted', { raw: res, rawText })
            return
          }

          const payload = {
            imagePath: this.data.imagePath,
            fields,
            rawTextPreview: rawText.slice(0, 500)
          }
          console.log('[scan-card] payload to confirm:', payload)
          this.goConfirm(payload)
        },
        fail: err => failAndStop('wx.ocrBusinessCard call failed', err)
      })
    } catch (error) {
      failAndStop('wx.ocrBusinessCard threw exception', error)
    }
  },

  tryUploadForDebug(filePath) {
    return new Promise(resolve => {
      if (!filePath) return resolve('')
      const cloudPath = `scan-debug/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`
      wx.cloud.uploadFile({
        cloudPath,
        filePath,
        success: uploadRes => resolve(uploadRes.fileID || ''),
        fail: err => {
          console.error('[scan-card] debug upload failed:', err)
          resolve('')
        }
      })
    })
  },

  collectText(input, bucket = []) {
    if (!input) return bucket
    if (typeof input === 'string') {
      bucket.push(input)
      return bucket
    }
    if (Array.isArray(input)) {
      input.forEach(item => this.collectText(item, bucket))
      return bucket
    }
    Object.keys(input).forEach(key => this.collectText(input[key], bucket))
    return bucket
  },

  extractFields(rawText) {
    const lines = rawText
      .split(/\n+/)
      .map(item => item.trim())
      .filter(Boolean)
    console.log('[scan-card] OCR flattened lines:', lines)

    const findByLabel = (labels) => {
      const line = lines.find(item => labels.some(label => item.includes(label)))
      if (!line) return ''
      return line.replace(/^(姓名|公司|职位|手机|电话|微信|邮箱|Email|E-mail|备注)[:：]?\s*/i, '').trim()
    }

    const phoneMatch = rawText.match(/1[3-9]\d{9}/)
    const emailMatch = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
    const wechatLabel = findByLabel(['微信', 'VX', 'WeChat'])
    const wechatMatch = wechatLabel || (rawText.match(/(?:微信|VX|WeChat)[:：]?\s*([A-Za-z][A-Za-z0-9_-]{5,19})/i) || [])[1] || ''

    const company = findByLabel(['公司']) || lines.find(item => /(公司|厂|集团|包装|食品|制造|贸易|实业|有限公司|有限责任)/.test(item)) || ''
    const title = findByLabel(['职位', '职务', '总经理', '经理', '销售', '总监', '老板', '主任', '商务']) || ''
    let name = findByLabel(['姓名', '联系人']) || ''
    if (!name) {
      name = lines.find(item => item.length >= 2 && item.length <= 8 && !/(公司|电话|手机|微信|邮箱|地址|职位|职务)/.test(item)) || ''
    }

    const note = findByLabel(['备注']) || ''

    return {
      contactName: name,
      phone: phoneMatch ? phoneMatch[0] : '',
      companyName: company,
      title,
      wechat: wechatMatch,
      email: emailMatch ? emailMatch[0] : '',
      note
    }
  },

  hasValidExtraction(fields) {
    if (!fields) return false
    const keys = ['contactName', 'phone', 'companyName', 'title', 'wechat', 'email', 'note']
    return keys.some(key => {
      const value = (fields[key] || '').toString().trim()
      return value.length > 0
    })
  },

  goConfirm(payload) {
    const isManualEntry = !!(payload && payload.manualEntry)
    if (!isManualEntry && (!payload || !payload.fields || !this.hasValidExtraction(payload.fields))) {
      console.error('[scan-card] invalid payload, stop navigation:', payload)
      wx.showToast({
        title: '未识别到有效名片信息，请更换更清晰的名片图片再试',
        icon: 'none'
      })
      return
    }
    this.setData({ recognizeError: false, errorMessage: '' })
    wx.setStorageSync('scanCardDraft', payload)
    wx.navigateTo({ url: '/pages/scan-confirm/scan-confirm' })
  },

  retryRecognize() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先选择名片图片', icon: 'none' })
      return
    }
    this.recognizeCard()
  },

  goManualEntry() {
    const payload = {
      imagePath: this.data.imagePath || '',
      manualEntry: true,
      fields: {
        contactName: '',
        phone: '',
        companyName: '',
        title: '',
        wechat: '',
        email: '',
        note: ''
      }
    }
    console.log('[scan-card] go manual entry payload:', payload)
    this.goConfirm(payload)
  }
})
