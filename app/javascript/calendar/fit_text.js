export function condenseTexts(root) {
  root.querySelectorAll("[data-condense]").forEach((el) => {
    el.style.transform = "none"
    const parent = el.parentElement
    const available = parent ? parent.clientWidth : el.clientWidth
    const needed = el.scrollWidth
    if (available > 0 && needed > available + 0.5) {
      el.style.transformOrigin = "left center"
      el.style.transform = `scaleX(${available / needed})`
    }
  })
}

export function scheduleCondense(root) {
  const run = () => condenseTexts(root)
  requestAnimationFrame(() => requestAnimationFrame(run))
  if (document.fonts?.ready) document.fonts.ready.then(run)
}

export function measureScale(text, font, maxWidth, canvas = measureScale.canvas) {
  if (!canvas) {
    measureScale.canvas = document.createElement("canvas")
    canvas = measureScale.canvas
  }
  const ctx = canvas.getContext("2d")
  ctx.font = font
  const width = ctx.measureText(text).width
  if (width <= maxWidth || maxWidth <= 0) return 1
  return maxWidth / width
}
