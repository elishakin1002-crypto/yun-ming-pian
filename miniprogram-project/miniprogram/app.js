App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloud1-5ge1ajtu530507cb',
      traceUser: true
    })

    this.globalData = {
      userInfo: null,
      // 设计令牌 — 所有页面通过 getApp().globalData.theme 访问
      theme: {
        primary: '#0066FF',
        primaryLight: '#E8F0FE',
        bg: '#f5f5f7',
        cardBg: '#ffffff',
        text: '#1d1d1f',
        textSecondary: '#86868b',
        textTertiary: '#acacac',
        border: '#e5e5e7',
        success: '#34c759',
        warning: '#ff9500',
        danger: '#ff3b30',
        radius: '16rpx',
        radiusLg: '24rpx',
        shadow: '0 2rpx 16rpx rgba(0,0,0,0.06)'
      }
    }
  }
})
