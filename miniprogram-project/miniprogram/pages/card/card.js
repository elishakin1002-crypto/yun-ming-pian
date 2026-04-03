const PHONE_REGEX = /^1[3-9]\d{9}$/

Page({
  data: {
    enterprise: null,
    isLoading: true,
    isSaved: false,
    isOwner: false,   // 是否是名片主人（控制操作栏显示）
    // 交换名片
    showExchange: false,
    myCards: [],
    hasOwnCard: false,
    exchanging: false,
    // 旧版留资表单（备用，无卡用户 fallback）
    showForm: false,
    submitting: false,
    leadForm: { name: '', phone: '', wechat: '', company: '', message: '' }
  },

  onLoad(options) {
    let id = options.id || ''
    if (!id && options.scene) {
      id = decodeURIComponent(options.scene)
    }
    this.enterpriseId = id
    if (this.enterpriseId) {
      this.fetchData()
      this.recordAction('views')
      return
    }
    this.setData({ isLoading: false })
    wx.showToast({ title: '名片参数缺失', icon: 'none' })
  },

  fetchData() {
    const db = wx.cloud.database()
    // 并行：拉名片数据 + 查当前用户是否是名片主人
    Promise.all([
      db.collection('enterprises').doc(this.enterpriseId).get(),
      wx.cloud.callFunction({ name: 'getMyCard' })
    ]).then(([cardRes, myCardRes]) => {
      const enterprise = cardRes.data
      // 判断是否是主人：自己的任意一张名片 _id 等于当前页面的 enterpriseId
      const myCards = myCardRes.result?.cards || (myCardRes.result?.card ? [myCardRes.result.card] : [])
      const isOwner = myCards.some(c => c._id === this.enterpriseId)
      this.setData({ enterprise, isOwner, isLoading: false })
    }).catch(err => {
      console.error('获取名片失败', err)
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
    const { enterprise } = this.data
    if (!enterprise || !enterprise.phone) {
      wx.showToast({ title: '暂无手机号', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: enterprise.phone })
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

  /* Save to wallet (名片夹) */
  saveToWallet() {
    if (this.data.isSaved) {
      wx.showToast({ title: '已在名片夹中', icon: 'none' })
      return
    }
    wx.cloud.callFunction({
      name: 'saveToWallet',
      data: { cardId: this.enterpriseId },
      success: res => {
        if (res.result && (res.result.success || res.result.error === 'SELF_SAVE')) {
          if (res.result.error === 'SELF_SAVE') {
            wx.showToast({ title: '不能收藏自己的名片', icon: 'none' })
          } else {
            this.setData({ isSaved: true })
            wx.showToast({ title: '已保存到名片夹', icon: 'success' })
            // 收藏成功后，检查用户是否已有名片 → 引导注册
            this._promptCreateCard()
          }
        } else {
          wx.showToast({ title: res.result?.message || '保存失败', icon: 'none' })
        }
      },
      fail: () => wx.showToast({ title: '网络异常', icon: 'none' })
    })
  },

  /* ====== 交换名片（新逻辑）====== */
  showLeadForm() {
    // 先查自己有没有名片
    wx.showLoading({ title: '加载中' })
    wx.cloud.callFunction({
      name: 'getMyCard',
      success: res => {
        wx.hideLoading()
        const cards = res.result?.cards || (res.result?.card ? [res.result.card] : [])
        if (cards.length > 0) {
          // 有名片 → 弹出选卡交换面板
          this.setData({ myCards: cards, hasOwnCard: true, showExchange: true })
        } else {
          // 没名片 → 引导创建
          wx.showModal({
            title: '还没有名片',
            content: '创建你的名片后即可一键交换，30秒搞定',
            confirmText: '去创建',
            cancelText: '稍后',
            success: r => {
              if (r.confirm) wx.navigateTo({ url: '/pages/register/register' })
            }
          })
        }
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

  /* 选中自己的一张名片进行交换 */
  doExchange(e) {
    if (this.data.exchanging) return
    const idx = e.currentTarget.dataset.index
    const myCard = this.data.myCards[idx]
    if (!myCard) return

    this.setData({ exchanging: true })

    // 双向操作：1. 把自己的信息作为线索发给对方  2. 把对方的卡存到自己名片夹
    const leadPromise = wx.cloud.callFunction({
      name: 'submitLead',
      data: {
        enterpriseId: this.enterpriseId,
        name: myCard.contactName || '',
        phone: myCard.phone || '',
        wechat: myCard.wechat || '',
        company: myCard.companyName || '',
        message: '名片交换'
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

  /* 旧版留资表单方法保留（兼容） */
  hideLeadForm() {
    if (this.data.submitting) return
    this.setData({ showForm: false })
  },
  onLeadInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`leadForm.${field}`]: e.detail.value })
  },

  goEdit() {
    if (!this.enterpriseId) return
    wx.navigateTo({ url: `/pages/register/register?edit=true&id=${this.enterpriseId}` })
  },

  goPoster() {
    if (!this.enterpriseId) return
    wx.navigateTo({ url: `/pages/poster/poster?id=${this.enterpriseId}` })
  },

  onShareAppMessage() {
    this.recordAction('forwards')
    const e = this.data.enterprise || {}
    const name = e.contactName || ''
    const titleText = e.title ? `${name} | ${e.title}` : `${name}的名片`
    const company = e.companyName ? ` · ${e.companyName}` : ''
    return {
      title: `${titleText}${company}`,
      path: `/pages/card/card?id=${this.enterpriseId}`
    }
  },

  /**
   * 收藏后引导注册：检查用户是否已有名片，没有则弹出引导
   */
  _promptCreateCard() {
    setTimeout(() => {
      wx.cloud.callFunction({
        name: 'getMyCard',
        success: res => {
          const cards = res.result?.cards || (res.result?.card ? [res.result.card] : [])
          if (cards.length === 0) {
            wx.showModal({
              title: '你也想拥有一张？',
              content: '30秒即可创建你的专属名片，随时分享',
              confirmText: '立即创建',
              cancelText: '稍后再说',
              success: (r) => {
                if (r.confirm) {
                  wx.navigateTo({ url: '/pages/register/register' })
                }
              }
            })
          }
        }
      })
    }, 1500)  // 延迟 1.5s，让收藏 Toast 先显示完
  }
})
