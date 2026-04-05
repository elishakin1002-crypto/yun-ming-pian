Page({
  data: {
    cardId: '',
    cardStyle: 'classic'
  },

  onLoad() {
    this.loadCard()
  },

  loadCard() {
    wx.cloud.callFunction({
      name: 'getMyCard',
      success: res => {
        const cards = res.result?.cards || (res.result?.card ? [res.result.card] : [])
        if (cards.length > 0) {
          const card = cards[0]
          this.setData({
            cardId: card._id,
            cardStyle: card.cardStyle || 'classic'
          })
        }
      }
    })
  },

  pickStyle(e) {
    const style = e.currentTarget.dataset.style
    if (style === this.data.cardStyle) return
    this.setData({ cardStyle: style })
    this.updateCard({ cardStyle: style })
  },

  updateCard(fields) {
    if (!this.data.cardId) return
    wx.cloud.callFunction({
      name: 'updateEnterprise',
      data: {
        enterpriseId: this.data.cardId,
        data: fields
      },
      success: res => {
        if (res.result?.success) {
          wx.showToast({ title: '已更新', icon: 'success' })
        }
      },
      fail: () => {
        wx.showToast({ title: '更新失败', icon: 'none' })
      }
    })
  },

  goEdit() {
    if (!this.data.cardId) return
    wx.navigateTo({ url: `/pages/register/register?edit=true&id=${this.data.cardId}` })
  }
})
