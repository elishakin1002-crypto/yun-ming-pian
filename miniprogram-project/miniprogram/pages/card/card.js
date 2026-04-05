function resolveEnterpriseId(options = {}) {
  const directId = typeof options.id === 'string' ? options.id.trim() : ''
  if (directId) return directId

  const scene = options.scene ? decodeURIComponent(options.scene) : ''
  if (!scene) return ''

  const matched = scene.match(/(?:^|[?&])id=([^&]+)/)
  if (matched && matched[1]) {
    return matched[1].trim()
  }
  return scene.trim()
}

Page({
  data: {
    enterprise: null,
    isLoading: true,
    isSaved: false,
    isOwner: false,
    showExchange: false,
    myCards: [],
    exchanging: false
  },

  onLoad(options) {
    console.log('[card] onLoad options:', options)
    this.enterpriseId = resolveEnterpriseId(options)
    console.log('[card] resolved enterpriseId:', this.enterpriseId)
    if (this.enterpriseId) {
      this.fetchData()
      this.recordAction('views')
      return
    }
    this.setData({ isLoading: false })
    wx.showToast({ title: '名片参数缺失', icon: 'none' })
  },

  fetchData() {
    Promise.all([
      wx.cloud.callFunction({
        name: 'getCardDetail',
        data: { enterpriseId: this.enterpriseId }
      }),
      wx.cloud.callFunction({ name: 'getMyCard' }).catch(() => ({ result: { cards: [] } })),
      wx.cloud.callFunction({ name: 'getWallet' }).catch(() => ({ result: { cards: [] } }))
    ]).then(([cardRes, myCardRes, walletRes]) => {
      if (!cardRes.result?.success || !cardRes.result?.card) {
        throw new Error(cardRes.result?.message || '名片不存在')
      }
      console.log('[card] fetched enterprise:', {
        enterpriseId: this.enterpriseId,
        enterpriseDocId: cardRes.result.card && cardRes.result.card._id
      })
      const enterprise = {
        ...cardRes.result.card,
        servicesText: Array.isArray(cardRes.result.card.services) ? cardRes.result.card.services.filter(Boolean).join(' / ') : ''
      }
      const myCards = myCardRes.result?.cards || (myCardRes.result?.card ? [myCardRes.result.card] : [])
      const walletCards = walletRes.result?.cards || []
      const isOwner = myCards.some(card => card._id === this.enterpriseId)
      const isSaved = walletCards.some(item => item.cardId === this.enterpriseId)

      this.setData({
        enterprise,
        myCards,
        isOwner,
        isSaved,
        isLoading: false
      })
    }).catch(err => {
      console.error('[card] 获取名片失败', {
        enterpriseId: this.enterpriseId,
        error: err
      })
      this.setData({ isLoading: false })
      wx.showToast({ title: '获取名片失败', icon: 'none' })
    })
  },

  recordAction(action) {
    wx.cloud.callFunction({
      name: 'recordInteraction',
      data: { enterpriseId: this.enterpriseId, action }
    }).catch(() => {})
  },

  callPhone() {
    const phone = this.data.enterprise && this.data.enterprise.phone
    if (!phone) {
      wx.showToast({ title: '暂无手机号', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  copyWechat() {
    const wechat = this.data.enterprise && this.data.enterprise.wechat
    if (!wechat) {
      wx.showToast({ title: '暂无微信号', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: wechat,
      success: () => wx.showToast({ title: '微信号已复制', icon: 'success' })
    })
  },

  saveToWallet() {
    if (this.data.isSaved) {
      wx.showToast({ title: '已保存名片', icon: 'none' })
      return
    }

    const payload = { cardId: this.enterpriseId }
    console.log('[card] saveToWallet request:', {
      payload,
      enterpriseId: this.enterpriseId,
      currentCardId: this.data.enterprise && this.data.enterprise._id,
      isSaved: this.data.isSaved,
      isOwner: this.data.isOwner
    })

    wx.cloud.callFunction({
      name: 'saveToWallet',
      data: payload,
      success: res => {
        console.log('[card] saveToWallet result:', res)
        if (res.result && (res.result.success || res.result.error === 'SELF_SAVE')) {
          if (res.result.error === 'SELF_SAVE') {
            wx.showToast({ title: '不能保存自己的名片', icon: 'none' })
          } else {
            this.setData({ isSaved: true })
            wx.showToast({ title: '保存成功', icon: 'success' })
            this._promptCreateCard()
          }
        } else {
          console.error('[card] saveToWallet business error:', {
            payload,
            result: res.result
          })
          wx.showToast({ title: res.result?.message || '保存失败', icon: 'none' })
        }
      },
      fail: err => {
        console.error('[card] saveToWallet call failed:', {
          payload,
          error: err
        })
        wx.showToast({ title: err?.errMsg || '网络异常', icon: 'none' })
      }
    })
  },

  showLeadForm() {
    wx.showLoading({ title: '加载中' })
    wx.cloud.callFunction({
      name: 'getMyCard',
      success: res => {
        wx.hideLoading()
        const cards = res.result?.cards || (res.result?.card ? [res.result.card] : [])
        if (cards.length > 0) {
          this.setData({ myCards: cards, showExchange: true })
          return
        }
        wx.showModal({
          title: '先创建你的名片',
          content: '创建后即可一键交换联系方式，并把对方信息沉淀到客户名片。',
          confirmText: '去创建',
          cancelText: '稍后',
          success: result => {
            if (result.confirm) {
              wx.navigateTo({ url: '/pages/register/register' })
            }
          }
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络异常', icon: 'none' })
      }
    })
  },

  hideExchange() {
    if (this.data.exchanging) return
    this.setData({ showExchange: false })
  },

  doExchange(e) {
    if (this.data.exchanging) return
    const idx = e.currentTarget.dataset.index
    const myCard = this.data.myCards[idx]
    if (!myCard) return

    this.setData({ exchanging: true })

    const leadPromise = wx.cloud.callFunction({
      name: 'submitLead',
      data: {
        enterpriseId: this.enterpriseId,
        name: myCard.contactName || '',
        phone: myCard.phone || '',
        wechat: myCard.wechat || '',
        company: myCard.companyName || '',
        message: '交换联系方式'
      }
    })

    const savePromise = wx.cloud.callFunction({
      name: 'saveToWallet',
      data: { cardId: this.enterpriseId }
    })

    Promise.all([leadPromise, savePromise])
      .then(() => {
        this.setData({ exchanging: false, showExchange: false, isSaved: true })
        wx.showToast({ title: '交换成功', icon: 'success' })
      })
      .catch(() => {
        this.setData({ exchanging: false })
        wx.showToast({ title: '交换失败，请重试', icon: 'none' })
      })
  },

  goEdit() {
    if (!this.enterpriseId) return
    wx.navigateTo({ url: `/pages/register/register?edit=true&id=${this.enterpriseId}` })
  },

  onShareAppMessage() {
    this.recordAction('forwards')
    const enterprise = this.data.enterprise || {}
    const name = enterprise.contactName || '查看名片'
    const company = enterprise.companyName ? `${enterprise.companyName} · ` : ''
    const title = enterprise.title ? `（${enterprise.title}）` : ''
    return {
      title: `${company}${name}${title}`,
      path: `/pages/card/card?id=${this.enterpriseId}`
    }
  },

  _promptCreateCard() {
    setTimeout(() => {
      wx.cloud.callFunction({
        name: 'getMyCard',
        success: res => {
          const cards = res.result?.cards || (res.result?.card ? [res.result.card] : [])
          if (cards.length === 0) {
            wx.showModal({
              title: '你也发一张名片',
              content: '创建自己的名片后，就能和客户交换联系方式。',
              confirmText: '立即创建',
              cancelText: '稍后',
              success: result => {
                if (result.confirm) {
                  wx.navigateTo({ url: '/pages/register/register' })
                }
              }
            })
          }
        }
      })
    }, 1200)
  }
})
