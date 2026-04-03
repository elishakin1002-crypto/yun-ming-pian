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

          // ---- 顶部名片卡（高度 320px，接近真实名片比例 2.1:1）----
          const themeColors = {
            classic: ['#0044bb', '#0066FF'],
            modern:  ['#3a3a3c', '#636366'],
            dark:    ['#1a1a1c', '#2c2c2e']
          }
          const colors = themeColors[card.cardStyle] || themeColors.classic
          const grad = ctx.createLinearGradient(0, 40, CANVAS_W, 360)
          grad.addColorStop(0, colors[0])
          grad.addColorStop(1, colors[1])
          ctx.fillStyle = grad
          this.roundRect(ctx, 40, 40, CANVAS_W - 80, 320, 28)
          ctx.fill()

          // dark 主题：金色描边
          if (card.cardStyle === 'dark') {
            ctx.strokeStyle = '#d4a853'
            ctx.lineWidth = 3
            this.roundRect(ctx, 40, 40, CANVAS_W - 80, 320, 28)
            ctx.stroke()
          }

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

    // ① 姓名 — 最大，最重要，与头像垂直居中对齐
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px sans-serif'
    ctx.fillText(card.contactName || '', textX, 125)

    // ② 公司名 — 第二重要，白色加粗
    ctx.font = 'bold 26px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fillText(card.companyName || '', textX, 181)

    // ③ 职位 — 辅助，弱化
    ctx.font = '22px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillText(card.title || '', textX, 219)

    // ④ 行业 — 最小最弱
    if (card.industry) {
      ctx.font = '20px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.52)'
      ctx.fillText(card.industry, textX, 253)
    }

    // ---- 联系信息白卡（y=390，顶部卡结束于 360，留 30px 间距）----
    ctx.fillStyle = '#ffffff'
    this.roundRect(ctx, 40, 390, CANVAS_W - 80, 188, 20)
    ctx.fill()

    ctx.textBaseline = 'middle'

    // 手机
    ctx.font = '24px sans-serif'
    ctx.fillStyle = '#86868b'
    ctx.fillText('手机', 84, 438)
    ctx.font = 'bold 30px sans-serif'
    ctx.fillStyle = '#1d1d1f'
    ctx.fillText(card.phone || '', 204, 438)

    // 分隔线
    ctx.strokeStyle = '#f2f2f7'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(84, 468)
    ctx.lineTo(CANVAS_W - 84, 468)
    ctx.stroke()

    // 微信
    ctx.font = '24px sans-serif'
    ctx.fillStyle = '#86868b'
    ctx.fillText('微信', 84, 508)
    ctx.font = '28px sans-serif'
    ctx.fillStyle = '#3a3a3c'
    ctx.fillText(card.wechat || '未填写', 204, 508)

    ctx.textBaseline = 'top'

    // ---- Growth 名片 bio ----
    let yOffset = 598
    if (card.cardRole === 'growth' && card.bio) {
      ctx.fillStyle = '#ffffff'
      this.roundRect(ctx, 40, yOffset, CANVAS_W - 80, 110, 20)
      ctx.fill()
      ctx.font = '24px sans-serif'
      ctx.fillStyle = '#6e6e73'
      ctx.textBaseline = 'middle'
      ctx.fillText(card.bio.substring(0, 38), 80, yOffset + 55)
      ctx.textBaseline = 'top'
      yOffset += 134
    }

    // ---- 小程序码：居中，220×220 ----
    const QR = 220
    const qrY = Math.max(yOffset + 20, 680)
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
    ctx.font = '22px sans-serif'
    ctx.fillStyle = '#86868b'
    ctx.textAlign = 'center'
    ctx.fillText('长按识别 查看名片', CANVAS_W / 2, qrY + QR + 32)
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
