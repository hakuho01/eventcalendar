const WEEKDAYS = [ "日", "月", "火", "水", "木", "金", "土" ]

export function defaultSettings() {
  return {
    showHeader: true,
    closedWeekdays: [ 3, 4 ],
    weekendDateColor: true,
    holidayDateColor: true,
    condenseText: true
  }
}

export function defaultTitle(month) {
  return `${month}月大会スケジュール`
}

export function buildWeeks(year, month) {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const lastDay = new Date(year, month, 0).getDate()
  const cells = Array.from({ length: firstWeekday }, () => null)
  for (let day = 1; day <= lastDay; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function holidayMap(holidays = []) {
  return Object.fromEntries(holidays.map((item) => [ String(item.day), item ]))
}

export function newEvent() {
  return {
    id: crypto.randomUUID(),
    time: "",
    title: "",
    tagId: null
  }
}

export function emptyDay() {
  return {
    mode: null,
    closedLabel: "定休日",
    holidayColor: null,
    events: []
  }
}

export function dayRecord(days, day) {
  return days[String(day)] || emptyDay()
}

export function resolveDay(year, month, day, settings, days, holidays) {
  const weekday = new Date(year, month - 1, day).getDay()
  const stored = dayRecord(days, day)
  const holiday = holidayMap(holidays)[String(day)]
  const closedByWeekday = (settings.closedWeekdays || []).map(Number).includes(weekday)
  const mode = stored.mode || (closedByWeekday ? "closed" : "events")

  return {
    day,
    weekday,
    weekdayLabel: WEEKDAYS[weekday],
    mode,
    closedLabel: stored.closedLabel || "定休日",
    holidayColor: stored.holidayColor,
    events: Array.isArray(stored.events) ? stored.events : [],
    holidayName: holiday?.name || null,
    closedByWeekday
  }
}

export const DATE_TONES = {
  holiday: "#e31c5f",
  saturday: "#2a6bff",
  normal: "#222222"
}

export function dateTone(state, settings) {
  if (state.holidayColor === true) return "holiday"
  if (state.holidayColor === false) return "normal"
  if (settings.holidayDateColor && state.holidayName) return "holiday"
  if (settings.weekendDateColor && state.weekday === 0) return "holiday"
  if (settings.weekendDateColor && state.weekday === 6) return "saturday"
  return "normal"
}

export function isHolidayColored(state, settings) {
  return dateTone(state, settings) === "holiday"
}

export function displayTime(time) {
  const value = (time || "").trim()
  if (!value) return ""
  return /[-〜~－]$/.test(value) ? value : `${value}-`
}

export function cloneDayPayload(state) {
  return {
    mode: state.mode,
    closedLabel: state.closedLabel,
    holidayColor: state.holidayColor,
    events: state.events.map((event) => ({
      ...event,
      id: crypto.randomUUID()
    }))
  }
}
