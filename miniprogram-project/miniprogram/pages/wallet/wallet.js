Page({
  data: {
    cards: [],
    isLoading: true,
    editingNote: null,
    noteText: '',
    hasOwnCard: true  // 默认true，避免闪烁
  },

  onShow() {
    this.loadWallet()
    this._checkOwnCard()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  loadWallet() {
    this.setData({ isLoading: true })
    wx.cloud.callFunction({
      name: 'getWallet',
      success: res => {
        this.setData({ cards: res.result?.cards || [], isLoading: false })
      },
      fail: () => {
        this.setData({ isLoading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  viewCard(e) {
    const cardId = e.currentTarget.dataset.cardid
    if (!cardId) return
    wx.navigateTo({ url: `/pages/card/card?id=${cardId}` })
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

  // Note editing
  showNoteEditor(e) {
    const id = e.currentTarget.dataset.id
    const note = e.currentTarget.dataset.note || ''
    this.setData({ editingNote: id, noteText: note })
  },

  onNoteInput(e) {
    this.setData({ noteText: e.detail.value })
  },

  saveNote() {
    const walletId = this.data.editingNote
    if (!walletId) return
    wx.cloud.callFunction({
      name: 'updateWalletNote',
      data: { walletId, note: this.data.noteText },
      success: () => {
        wx.showToast({ title: '备注已保存', icon: 'success' })
        this.setData({ editingNote: null, noteText: '' })
        this.loadWallet()
      },
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  cancelNote() {
    this.setData({ editingNote: null, noteText: '' })
  },

  goCreateCard() {
    wx.navigateTo({ url: '/pages/register/register' })
  },

  _checkOwnCard() {
    wx.cloud.callFunction({
      name: 'getMyCard',
      success: res => {
        const cards = res.result?.cards || (res.result?.card ? [res.result.card] : [])
        this.setData({ hasOwnCard: cards.length > 0 })
      }
    })
  }
})
