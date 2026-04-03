Page({
  data: {
    services: [
      {
        icon: '🏅',
        title: '认证咨询',
        desc: 'ISO体系认证、行业资质认定、合规审查，帮助企业快速取得权威认证，提升市场竞争力。'
      },
      {
        icon: '📊',
        title: '企业管理',
        desc: '战略规划、组织架构优化、绩效体系搭建，为企业提供系统化管理解决方案。'
      },
      {
        icon: '💡',
        title: '数字化管理赋能',
        desc: '小程序开发、业务流程数字化、数据看板建设，帮助传统企业实现降本增效。'
      }
    ],
    achievements: [
      { value: '3000+', label: '企业服务经验' },
      { value: '500+',  label: '复杂合规项目' },
      { value: '20+',   label: '年行业积淀'   },
      { value: '4',     label: '大行业深耕'   }
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  callConsult() {
    wx.makePhoneCall({ phoneNumber: '请替换为公司咨询电话' })
  },

  goRegister() {
    wx.switchTab({ url: '/pages/my-card/my-card' })
  }
})
