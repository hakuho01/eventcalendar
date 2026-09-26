import { buildWeeks, dateTone, displayTime, resolveDay } from "calendar/grid"
import { scheduleCondense } from "calendar/fit_text"

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function tagById(tags, id) {
  if (id == null || id === "") return null
  return tags.find((tag) => String(tag.id) === String(id)) || null
}

function renderEvent(event, tags, condense) {
  const tag = tagById(tags, event.tagId)
  const time = displayTime(event.time)
  const title = event.title || ""
  const tagHtml = tag
    ? `<span class="cal-tag" style="background:${escapeHtml(tag.bg_color)};color:${escapeHtml(tag.text_color)}">${escapeHtml(tag.name)}</span>`
    : ""

  const titleHtml = condense
    ? `<div class="cal-event-title"><span data-condense>${escapeHtml(title)}</span></div>`
    : `<div class="cal-event-title">${escapeHtml(title)}</div>`

  return `
    <div class="cal-event">
      <div class="cal-event-meta">
        <span class="cal-time">${escapeHtml(time)}</span>
        ${tagHtml}
      </div>
      ${titleHtml}
    </div>
  `
}

function renderCell(day, calendar, tags, holidays, selectedDay) {
  if (!day) return `<div class="cal-cell cal-cell-empty"></div>`

  const settings = calendar.settings
  const state = resolveDay(calendar.year, calendar.month, day, settings, calendar.days, holidays)
  const selected = Number(selectedDay) === day ? " is-selected" : ""
  const tone = dateTone(state, settings)
  const dateClass = tone === "normal" ? "" : ` is-${tone}`

  if (state.mode === "closed") {
    return `
      <button type="button" class="cal-cell${selected}" data-day="${day}">
        <span class="cal-date${dateClass}">${day}</span>
        <span class="cal-closed">${escapeHtml(state.closedLabel || "定休日")}</span>
      </button>
    `
  }

  const events = state.events.filter((event) => event.time || event.title || event.tagId)
  return `
    <button type="button" class="cal-cell${selected}" data-day="${day}">
      <span class="cal-date${dateClass}">${day}</span>
      <div class="cal-events">
        ${events.map((event) => renderEvent(event, tags, settings.condenseText)).join("")}
      </div>
    </button>
  `
}

export function renderCalendar(preview, calendar, tags, holidays, selectedDay) {
  const settings = calendar.settings
  const weeks = buildWeeks(calendar.year, calendar.month)
  const header = settings.showHeader
    ? `<div class="cal-header">
        <h2 class="cal-title">${escapeHtml(calendar.title || "")}</h2>
        <img class="cal-logo" src="/brand/logo.png" alt="" onerror="this.hidden = true">
      </div>`
    : ""

  preview.innerHTML = `
    ${header}
    <div class="cal-grid" style="--rows:${weeks.length}">
      ${weeks.map((week) => week.map((day) => renderCell(day, calendar, tags, holidays, selectedDay)).join("")).join("")}
    </div>
  `

  if (settings.condenseText) scheduleCondense(preview)
}
