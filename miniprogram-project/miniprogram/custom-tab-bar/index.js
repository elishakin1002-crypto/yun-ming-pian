Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/my-card/my-card', text: '我的名片', icon: 'card', iconActive: 'card-active' },
      { pagePath: '/pages/wallet/wallet',   text: '客户名片',   icon: 'wallet', iconActive: 'wallet-active' }
    ]
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const url   = e.currentTarget.dataset.path
      wx.switchTab({ url })
      this.setData({ selected: index })
    }
  }
})
