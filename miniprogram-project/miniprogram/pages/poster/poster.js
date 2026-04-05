/**
 * 名片海报生成页
 * 使用 Canvas 2D 绘制名片海报（含小程序码），支持保存到相册。
 */
const CANVAS_W = 750
const CANVAS_H = 1200

Page({
  data: {
    card: null,
    isDrawing: true,
    posterPath: ''   // 临时图片路径，用于预览和保存
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数缺失', icon: 'none' })
      return
    }
    this.enterpriseId = id
    this.loadAndDraw()
  },

  async loadAndDraw() {
    wx.showLoading({ title: '生成海报中' })
    try {
      // 1. 获取名片数据
      const cardRes = await wx.cloud.database().collection('enterprises').doc(this.enterpriseId).get()
      this.setData({ card: cardRes.data })

      // 2. 获取小程序码（云函数生成）
      const codeRes = await wx.cloud.callFunction({
        name: 'getWxacode',
        data: { path: `pages/card/card?id=${this.enterpriseId}` }
      })
      const qrcodeFileID = codeRes.result && codeRes.result.fileID

      // 3. 下载小程序码 + LOGO 到本地临时路径
      const [codeTmp, logoTmp] = await Promise.all([
        qrcodeFileID ? this.downloadFile(qrcodeFileID) : Promise.resolve(''),
        cardRes.data.logoUrl ? this.downloadFile(cardRes.data.logoUrl) : Promise.resolve('')
      ])

      // 4. Canvas 绘制
      await this.drawPoster(cardRes.data, codeTmp, logoTmp)
    } catch (e) {
      console.error('海报生成失败', e)
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
    }
    wx.hideLoading()
    this.setData({ isDrawing: false })
  },

  downloadFile(url) {
    // 云文件 ID 用 getTempFileURL，普通 URL 用 downloadFile
    if (url.startsWith('cloud://')) {
      return new Promise((resolve, reject) => {
        wx.cloud.getTempFileURL({
          fileList: [url],
          success: res => {
            const tempUrl = res.fileList[0] && res.fileList[0].tempFileURL
            if (!tempUrl) return resolve('')
            wx.downloadFile({
              url: tempUrl,
              success: r => resolve(r.tempFilePath),
              fail: () => resolve('')
            })
          },
          fail: () => resolve('')
        })
      })
    }
    return new Promise(resolve => {
      wx.downloadFile({
        url,
        success: r => resolve(r.tempFilePath),
        fail: () => resolve('')
      })
    })
  },

  drawPoster(card, codePath, logoPath) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery()
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec(res => {
          if (!res[0]) return reject(new Error('canvas not found'))
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getWindowInfo().pixelRatio || 2
          canvas.width = CANVAS_W * dpr
          canvas.height = CANVAS_H * dpr
          ctx.scale(dpr, dpr)

          // ---- 背景 ----
          ctx.fillStyle = '#f0f0f2'
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

          // ---- 上半区：固定商务风，不跟主题皮肤变化 ----
          const grad = ctx.createLinearGradient(0, 40, CANVAS_W, 360)
          grad.addColorStop(0, '#1f5eff')
          grad.addColorStop(1, '#3d7bff')
          ctx.fillStyle = grad
          this.roundRect(ctx, 40, 40, CANVAS_W - 80, 320, 28)
          ctx.fill()

          // ---- 头像：radius=70（直径 140px），在卡片内垂直居中----
          // 卡片从 y=40 到 y=360，中心 y=200；头像与卡片垂直居中
          const aX = 130, aY = 200, aR = 70

          // 字母头像（无 logo 时的 fallback）
          const drawLetterAvatar = () => {
            ctx.beginPath()
            ctx.arc(aX, aY, aR, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255,255,255,0.18)'
            ctx.fill()
            ctx.strokeStyle = 'rgba(255,255,255,0.45)'
            ctx.lineWidth = 4
            ctx.stroke()
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 68px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText((card.contactName || '?')[0], aX, aY)
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
          }

          const continueDrawing = () => this.drawTexts(ctx, card, canvas, codePath, resolve, aX, aR)

          if (logoPath) {
            try {
              const logoImg = canvas.createImage()
              logoImg.onload = () => {
                ctx.save()
                ctx.beginPath()
                ctx.arc(aX, aY, aR, 0, Math.PI * 2)
                ctx.clip()
                ctx.drawImage(logoImg, aX - aR, aY - aR, aR * 2, aR * 2)
                ctx.restore()
                // 白色描边环（增加辨识度）
                ctx.strokeStyle = 'rgba(255,255,255,0.55)'
                ctx.lineWidth = 5
                ctx.beginPath()
                ctx.arc(aX, aY, aR, 0, Math.PI * 2)
                ctx.stroke()
                continueDrawing()
              }
              logoImg.onerror = () => { drawLetterAvatar(); continueDrawing() }
              logoImg.src = logoPath
              return
            } catch (e) { /* fallback */ }
          }
          drawLetterAvatar()
          continueDrawing()
        })
    })
  },

  // aX / aR 传入以便对齐文字起始 x
  drawTexts(ctx, card, canvas, codePath, resolve, aX, aR) {
    const textX = (aX || 130) + (aR || 70) + 20  // 默认 220

    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // ① 姓名
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText(card.contactName || '', textX, 125)

    // ② 公司名
    ctx.font = 'bold 28px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fillText(card.companyName || '', textX, 181)

    // ③ 职位（弱化）
    if (card.title) {
      ctx.font = '22px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.fillText(card.title, textX, 219)
    }

    // ---- 下半区：二维码 + 一句短文案 ----
    ctx.fillStyle = '#ffffff'
    this.roundRect(ctx, 40, 420, CANVAS_W - 80, 560, 24)
    ctx.fill()

    ctx.textBaseline = 'top'

    ctx.font = '26px sans-serif'
    ctx.fillStyle = '#667085'
    ctx.textAlign = 'center'
    ctx.fillText('扫码查看名片，直接联系我', CANVAS_W / 2, 474)

    // ---- 小程序码：居中，220×220 ----
    const QR = 240
    const qrY = 560
    const qrX = (CANVAS_W - QR) / 2

    if (codePath) {
      try {
        const codeImg = canvas.createImage()
        codeImg.onload = () => {
          ctx.drawImage(codeImg, qrX, qrY, QR, QR)
          this.drawFooter(ctx, qrY, QR, canvas, resolve)
        }
        codeImg.onerror = () => {
          this.drawQrPlaceholder(ctx, qrX, qrY, QR)
          this.drawFooter(ctx, qrY, QR, canvas, resolve)
        }
        codeImg.src = codePath
        return
      } catch (e) { /* fallback */ }
    }
    this.drawQrPlaceholder(ctx, qrX, qrY, QR)
    this.drawFooter(ctx, qrY, QR, canvas, resolve)
  },

  // 无小程序码时的占位提示
  drawQrPlaceholder(ctx, qrX, qrY, QR) {
    ctx.save()
    ctx.fillStyle = '#e5e5ea'
    this.roundRect(ctx, qrX, qrY, QR, QR, 16)
    ctx.fill()
    ctx.font = '22px sans-serif'
    ctx.fillStyle = '#aeaeb2'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('小程序发布后', CANVAS_W / 2, qrY + QR / 2 - 18)
    ctx.fillText('显示二维码', CANVAS_W / 2, qrY + QR / 2 + 18)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.restore()
  },

  drawFooter(ctx, qrY, QR, canvas, resolve) {
    ctx.font = '24px sans-serif'
    ctx.fillStyle = '#667085'
    ctx.textAlign = 'center'
    ctx.fillText('名片已备好，欢迎随时沟通', CANVAS_W / 2, qrY + QR + 68)
    ctx.textAlign = 'left'

    // 导出图片
    wx.canvasToTempFilePath({
      canvas,
      width: canvas.width,
      height: canvas.height,
      destWidth: canvas.width,
      destHeight: canvas.height,
      fileType: 'png',
      success: res => {
        this.setData({ posterPath: res.tempFilePath })
        resolve()
      },
      fail: err => {
        console.error('导出图片失败', err)
        resolve()
      }
    })
  },

  // 辅助：圆角矩形路径
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  },

  saveToAlbum() {
    if (!this.data.posterPath) {
      wx.showToast({ title: '海报还未生成', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterPath,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: err => {
        if (err.errMsg.indexOf('auth deny') >= 0) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存图片到相册',
            confirmText: '去设置',
            success: r => { if (r.confirm) wx.openSetting() }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  }
})
