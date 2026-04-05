Page({
  data: {
    cards: [],
    card: null,
    activeCardIndex: 0,
    isLoading: true,
    newLeadCount: 0
  },

  onShow() {
    this.loadMyCards()
    const afterCreateShare = wx.getStorageSync('afterCreateShare')
    if (afterCreateShare) {
      wx.removeStorageSync('afterCreateShare')
      wx.showToast({ title: '点击“发名片”立即分享', icon: 'none' })
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  resetCardState(extra = {}) {
    this._shareImagePath = ''
    this.setData({
      cards: [],
      card: null,
      activeCardIndex: 0,
      newLeadCount: 0,
      ...extra
    })
  },

  loadMyCards() {
    this.resetCardState({ isLoading: true })
    wx.cloud.callFunction({
      name: 'getMyCard',
      success: res => {
        const { cards, card, newLeadCount } = res.result || {}
        const cardList = cards || (card ? [card] : [])
        console.log('[my-card] getMyCard result:', {
          count: Array.isArray(cardList) ? cardList.length : 0,
          cardIds: Array.isArray(cardList) ? cardList.map(item => this.getCardId(item)) : []
        })
        this.setData({
          cards: cardList,
          card: cardList[this.data.activeCardIndex] || cardList[0] || null,
          newLeadCount: newLeadCount || 0,
          isLoading: false
        })
        // 预渲染分享图（不阻塞主流程）
        if (cardList.length > 0) {
          setTimeout(() => this._renderShareImage(), 300)
        }
      },
      fail: (err) => {
        console.error('getMyCard调用失败:', err)
        this.resetCardState({ isLoading: false })
        wx.showToast({ title: '加载失败，请检查网络', icon: 'none' })
      }
    })
  },

  switchCard(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({
      activeCardIndex: idx,
      card: this.data.cards[idx]
    })
    setTimeout(() => this._renderShareImage(), 120)
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  },

  goCreateNew() {
    wx.navigateTo({ url: '/pages/register/register' })
  },

  goEdit() {
    const card = this.data.card
    if (!card) return
    const cardId = this.getCardId(card)
    if (!cardId) {
      console.error('[my-card] goEdit failed: missing card id', card)
      wx.showToast({ title: '名片数据异常，请刷新后重试', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/register/register?edit=true&id=${cardId}` })
  },

  goScanCard() {
    wx.navigateTo({ url: '/pages/scan-card/scan-card' })
  },

  goLeads() {
    wx.navigateTo({ url: '/pages/leads/leads' })
  },

  goWallet() {
    wx.switchTab({ url: '/pages/wallet/wallet' })
  },

  goPoster() {
    const card = this.data.card
    const cardId = this.getCardId(card)
    if (!cardId) return
    wx.navigateTo({ url: `/pages/poster/poster?id=${cardId}` })
  },

  previewCard() {
    const card = this.data.card
    const cardId = this.getCardId(card)
    if (!cardId) {
      console.error('[my-card] previewCard failed: missing card id', card)
      wx.showToast({ title: '名片数据异常，请刷新后重试', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/card/card?id=${encodeURIComponent(cardId)}` })
  },

  onShareAppMessage() {
    const card = this.data.card || {}
    const cardId = this.getCardId(card)
    const name = card.contactName || ''
    const company = card.companyName || ''
    const role = card.title || ''
    // 直白标题：公司名 + 姓名，让收到名片的人一眼看懂是谁
    let shareTitle = ''
    if (company && name) {
      shareTitle = role ? `${company} ${name}（${role}）` : `${company} · ${name}`
    } else {
      shareTitle = name || '查看名片'
    }
    if (!cardId) {
      console.error('[my-card] share aborted: missing card id', card)
      return {
        title: name || '查看名片',
        path: '/pages/my-card/my-card'
      }
    }
    const sharePayload = {
      title: shareTitle,
      path: `/pages/card/card?id=${encodeURIComponent(cardId)}`,
      imageUrl: this._shareImagePath || ''
    }
    console.log('[my-card] share payload:', {
      cardId,
      path: sharePayload.path,
      title: sharePayload.title
    })
    return sharePayload
  },

  getCardId(card) {
    if (!card || typeof card !== 'object') return ''
    return card._id || card.id || ''
  },

  /**
   * 将 cloud:// 或 https:// URL 转为本地临时路径
   */
  _getLocalPath(url) {
    if (!url) return Promise.resolve('')
    if (url.startsWith('cloud://')) {
      return new Promise(resolve => {
        wx.cloud.getTempFileURL({
          fileList: [url],
          success: res => {
            const tempUrl = res.fileList[0] && res.fileList[0].tempFileURL
            if (!tempUrl) return resolve('')
            wx.downloadFile({ url: tempUrl, success: r => resolve(r.tempFilePath), fail: () => resolve('') })
          },
          fail: () => resolve('')
        })
      })
    }
    return new Promise(resolve => {
      wx.downloadFile({ url, success: r => resolve(r.tempFilePath), fail: () => resolve('') })
    })
  },

  /**
   * 预渲染分享卡片图 (5:4 比例, 500x400)
   * 在名片数据加载后调用，不阻塞主流程
   */
  _renderShareImage() {
    const card = this.data.card
    if (!card) return

    // 先下载头像到本地，再绘制 canvas
    this._getLocalPath(card.logoUrl).then(avatarLocalPath => {
      const query = wx.createSelectorQuery()
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const W = 500, H = 400
          canvas.width = W
          canvas.height = H

          const themeColors = {
            classic: ['#0066FF', '#5AC8FA'],
            modern: ['#48484a', '#636366'],
            dark: ['#1c1c1e', '#C9A96E']
          }
          const colors = themeColors[card.cardStyle] || themeColors.classic

          const exportImage = () => {
            wx.canvasToTempFilePath({
              canvas, width: W, height: H, destWidth: W * 2, destHeight: H * 2,
              fileType: 'jpg', quality: 0.9,
              success: r => { this._shareImagePath = r.tempFilePath },
              fail: err => console.warn('分享图生成失败:', err)
            })
          }

          // 头像参数：放大到 radius=52（直径104px）
          const aX = 74, aY = 130, aR = 52
          const textX = aX + aR + 24  // 文字起始 x = 头像右边缘 + 间距

          const drawInfo = () => {
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'

            // 姓名 — 最大最黑
            ctx.fillStyle = '#1d1d1f'
            ctx.font = 'bold 40px sans-serif'
            ctx.fillText(card.contactName || '', textX, 74)

            // 公司名 — 第二重要，加粗深色
            ctx.fillStyle = '#3a3a3c'
            ctx.font = 'bold 26px sans-serif'
            ctx.fillText(card.companyName || '', textX, 128)

            // 职位 — 弱化，灰色小字
            if (card.title) {
              ctx.fillStyle = '#aeaeb2'
              ctx.font = '22px sans-serif'
              ctx.fillText(card.title, textX, 168)
            }

            // 分隔线
            ctx.strokeStyle = '#eeeeee'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(28, 222)
            ctx.lineTo(W - 28, 222)
            ctx.stroke()

            // 电话 — 大号显示，方便看清楚
            if (card.phone) {
              ctx.fillStyle = '#86868b'
              ctx.font = '20px sans-serif'
              ctx.fillText('电话', 36, 244)
              ctx.fillStyle = '#1d1d1f'
              ctx.font = 'bold 26px sans-serif'
              ctx.fillText(card.phone, 90, 240)
            }

            // 微信 — 小号展示
            if (card.wechat) {
              ctx.fillStyle = '#86868b'
              ctx.font = '20px sans-serif'
              ctx.fillText('微信', 36, 290)
              ctx.fillStyle = '#6e6e73'
              ctx.font = '22px sans-serif'
              ctx.fillText(card.wechat, 90, 288)
            }

            // 底部 CTA
            ctx.fillStyle = '#c7c7cc'
            ctx.font = '18px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('点击查看完整名片 ›', W / 2, H - 26)
            exportImage()
          }

          const drawLetterAvatar = (aX, aY, aR) => {
            const grad = ctx.createLinearGradient(0, 0, aR * 2, aR * 2)
            grad.addColorStop(0, colors[0])
            grad.addColorStop(1, colors[1])
            ctx.beginPath()
            ctx.arc(aX, aY, aR, 0, Math.PI * 2)
            ctx.fillStyle = grad
            ctx.fill()
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 38px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText((card.contactName || '?')[0], aX, aY)
          }

          // 背景白底
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, W, H)

          // 顶部色带（加高到 8px，更有品牌感）
          const grad = ctx.createLinearGradient(0, 0, W, 0)
          grad.addColorStop(0, colors[0])
          grad.addColorStop(1, colors[1])
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, W, 8)

          if (avatarLocalPath) {
            const img = canvas.createImage()
            img.onload = () => {
              ctx.save()
              ctx.beginPath()
              ctx.arc(aX, aY, aR, 0, Math.PI * 2)
              ctx.clip()
              ctx.drawImage(img, aX - aR, aY - aR, aR * 2, aR * 2)
              ctx.restore()
              drawInfo()
            }
            img.onerror = () => {
              drawLetterAvatar(aX, aY, aR)
              drawInfo()
            }
            img.src = avatarLocalPath
          } else {
            drawLetterAvatar(aX, aY, aR)
            drawInfo()
          }
        })
    })
  }
})
