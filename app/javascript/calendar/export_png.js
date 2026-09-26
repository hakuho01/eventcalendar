import { buildWeeks, DATE_TONES, dateTone, displayTime, resolveDay } from "calendar/grid"
import { measureScale } from "calendar/fit_text"

function tagById(tags, id) {
  if (id == null || id === "") return null
  return tags.find((tag) => String(tag.id) === String(id)) || null
}

function drawCondensedText(ctx, text, x, y, maxWidth, font, color, weight = "500") {
  ctx.save()
  ctx.font = `${weight} ${font}`
  ctx.fillStyle = color
  ctx.textBaseline = "middle"
  const scale = measureScale(text, `${weight} ${font}`, maxWidth, ctx.canvas)
  ctx.translate(x, y)
  ctx.scale(scale, 1)
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

function loadLogo() {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = "/brand/logo.png"
  })
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

export async function exportCalendarPng(calendar, tags, holidays) {
  await document.fonts.ready
  const logo = await loadLogo()

  const weeks = buildWeeks(calendar.year, calendar.month)
  const scale = 2
  const width = 2000
  const headerHeight = calendar.settings.showHeader ? 160 : 0
  const gridHeight = weeks.length >= 6 ? 980 : 920
  const height = headerHeight + gridHeight
  const canvas = document.createElement("canvas")
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext("2d")
  ctx.scale(scale, scale)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)

  if (calendar.settings.showHeader) {
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, width, headerHeight)
    ctx.fillStyle = "#ffffff"
    ctx.font = "900 72px 'Noto Sans JP', sans-serif"
    ctx.textBaseline = "middle"
    ctx.fillText(calendar.title || "", 48, headerHeight / 2 + 4, width * 0.62)
    if (logo) {
      const maxH = 88
      const maxW = 420
      const ratio = Math.min(maxH / logo.height, maxW / logo.width, 1)
      const logoW = logo.width * ratio
      const logoH = logo.height * ratio
      ctx.drawImage(logo, width - logoW - 40, (headerHeight - logoH) / 2, logoW, logoH)
    }
  }

  const cols = 7
  const rows = weeks.length
  const gridTop = headerHeight
  const cellW = width / cols
  const cellH = gridHeight / rows

  ctx.strokeStyle = "#ededed"
  ctx.lineWidth = 1
  for (let r = 0; r <= rows; r += 1) {
    ctx.beginPath()
    ctx.moveTo(0, gridTop + r * cellH)
    ctx.lineTo(width, gridTop + r * cellH)
    ctx.stroke()
  }
  for (let c = 0; c <= cols; c += 1) {
    ctx.beginPath()
    ctx.moveTo(c * cellW, gridTop)
    ctx.lineTo(c * cellW, gridTop + gridHeight)
    ctx.stroke()
  }

  weeks.forEach((week, row) => {
    week.forEach((day, col) => {
      if (!day) return
      const x = col * cellW
      const y = gridTop + row * cellH
      const state = resolveDay(calendar.year, calendar.month, day, calendar.settings, calendar.days, holidays)
      const dateColor = DATE_TONES[dateTone(state, calendar.settings)]

      ctx.fillStyle = dateColor
      ctx.font = "500 22px 'Noto Sans JP', sans-serif"
      ctx.textAlign = "right"
      ctx.textBaseline = "top"
      ctx.fillText(String(day), x + cellW - 16, y + 12)
      ctx.textAlign = "left"

      const contentWidth = cellW - 36
      const left = x + 18

      if (state.mode === "closed") {
        ctx.fillStyle = "#d0d0d0"
        ctx.font = "700 34px 'Noto Sans JP', sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(state.closedLabel || "定休日", x + cellW / 2, y + cellH / 2 + 8)
        ctx.textAlign = "left"
        return
      }

      const events = state.events.filter((event) => event.time || event.title || event.tagId)
      if (events.length === 0) return

      const blockHeight = events.length * 58
      let cursor = y + (cellH - blockHeight) / 2 + 10

      events.forEach((event) => {
        const tag = tagById(tags, event.tagId)
        const time = displayTime(event.time)
        let metaX = left

        if (time) {
          drawCondensedText(ctx, time, metaX, cursor + 10, contentWidth, "18px 'Noto Sans JP', sans-serif", "#111", "500")
          ctx.font = "500 18px 'Noto Sans JP', sans-serif"
          metaX += ctx.measureText(time).width + 8
        }

        if (tag) {
          ctx.font = "700 11px 'Noto Sans JP', sans-serif"
          const tagWidth = Math.min(contentWidth - (metaX - left), ctx.measureText(tag.name).width + 12)
          roundedRect(ctx, metaX, cursor + 1, tagWidth, 18, 2)
          ctx.fillStyle = tag.bg_color
          ctx.fill()
          ctx.fillStyle = tag.text_color
          ctx.textBaseline = "middle"
          ctx.fillText(tag.name, metaX + 6, cursor + 10)
        }

        if (event.title) {
          drawCondensedText(
            ctx,
            event.title,
            left,
            cursor + 36,
            contentWidth,
            "22px 'Noto Sans JP', sans-serif",
            "#111",
            "700"
          )
        }

        cursor += 58
      })
    })
  })

  return canvas.toDataURL("image/png")
}

export function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = filename
  link.click()
}
