import { createCalendar, createTag, deleteTag, fetchHolidays, updateCalendar, updateTag } from "calendar/api"
import { downloadDataUrl, exportCalendarPng } from "calendar/export_png"
import { cloneDayPayload, defaultSettings, defaultTitle, emptyDay, newEvent, resolveDay } from "calendar/grid"
import { renderCalendar } from "calendar/render"

const WEEKDAY_OPTIONS = [
  [ 0, "日" ],
  [ 1, "月" ],
  [ 2, "火" ],
  [ 3, "水" ],
  [ 4, "木" ],
  [ 5, "金" ],
  [ 6, "土" ]
]

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function payloadFrom(calendar) {
  return {
    title: calendar.title,
    year: calendar.year,
    month: calendar.month,
    settings: calendar.settings,
    days: calendar.days
  }
}

function escapeAttr(value) {
  return String(value ?? "").replaceAll('"', "&quot;")
}

export class CalendarEditor {
  constructor(root, bootstrap) {
    this.root = root
    this.sidebar = root.querySelector("[data-editor-target='sidebar']")
    this.preview = root.querySelector("[data-editor-target='preview']")
    this.statusEl = root.querySelector("[data-editor-target='status']")
    this.routes = bootstrap.routes
    this.calendar = this.normalizeCalendar(bootstrap.calendar)
    this.tags = bootstrap.tags || []
    this.holidays = bootstrap.holidays || []
    this.selectedDay = null
    this.clipboard = null
    this.pendingPaste = false
    this.pendingPasteFrom = null
    this.dirty = false
    this.saving = false
    this.saveTimer = null
    this.boundKeydown = (event) => this.onKeydown(event)
    this.boundResize = () => this.renderPreview()
    this.boundUnload = (event) => {
      if (!this.dirty) return
      event.preventDefault()
      event.returnValue = ""
    }

    this.renderAll()
    this.preview.addEventListener("click", (event) => this.onPreviewClick(event))
    this.sidebar.addEventListener("input", (event) => this.onSidebarInput(event))
    this.sidebar.addEventListener("change", (event) => this.onSidebarChange(event))
    this.sidebar.addEventListener("click", (event) => this.onSidebarClick(event))
    document.addEventListener("keydown", this.boundKeydown)
    window.addEventListener("resize", this.boundResize)
    window.addEventListener("beforeunload", this.boundUnload)
  }

  destroy() {
    document.removeEventListener("keydown", this.boundKeydown)
    window.removeEventListener("resize", this.boundResize)
    window.removeEventListener("beforeunload", this.boundUnload)
    clearTimeout(this.saveTimer)
  }

  normalizeCalendar(raw) {
    return {
      id: raw.id,
      title: raw.title || defaultTitle(raw.month),
      year: Number(raw.year),
      month: Number(raw.month),
      settings: { ...defaultSettings(), ...(raw.settings || {}) },
      days: raw.days || {},
      updatedAt: raw.updatedAt
    }
  }

  setStatus(text, kind = "") {
    this.statusEl.textContent = text
    this.statusEl.dataset.kind = kind
  }

  markDirty() {
    this.dirty = true
    this.setStatus("未保存", "dirty")
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.save(), 1200)
  }

  renderAll() {
    this.renderSidebar()
    this.renderPreview()
  }

  renderPreview() {
    renderCalendar(this.preview, this.calendar, this.tags, this.holidays, this.selectedDay)
  }

  selectedState() {
    if (!this.selectedDay) return null
    return resolveDay(
      this.calendar.year,
      this.calendar.month,
      this.selectedDay,
      this.calendar.settings,
      this.calendar.days,
      this.holidays
    )
  }

  writeDay(day, patch) {
    const key = String(day)
    const current = this.calendar.days[key] || emptyDay()
    this.calendar.days = {
      ...this.calendar.days,
      [key]: { ...current, ...patch }
    }
  }

  renderSidebar() {
    const { calendar } = this
    const monthValue = `${calendar.year}-${String(calendar.month).padStart(2, "0")}`
    const selected = this.selectedState()

    this.sidebar.innerHTML = `
      <section class="panel">
        <div class="panel-head">
          <h3>${selected ? `${calendar.month}/${selected.day}（${selected.weekdayLabel}）` : "日付を選択"}</h3>
          ${this.clipboard ? `<span class="copy-chip">コピー中</span>` : ""}
        </div>
        ${this.renderDayEditor(selected)}
      </section>

      <section class="panel">
        <h3>カレンダー設定</h3>
        <label class="field">
          <span>タイトル</span>
          <input type="text" name="title" value="${escapeAttr(calendar.title)}" maxlength="80">
        </label>
        <label class="field">
          <span>対象月</span>
          <input type="month" name="month" value="${monthValue}">
        </label>
        <label class="check">
          <input type="checkbox" name="showHeader" ${calendar.settings.showHeader ? "checked" : ""}>
          黒いタイトルバーを表示する
        </label>
        <label class="check">
          <input type="checkbox" name="weekendDateColor" ${calendar.settings.weekendDateColor ? "checked" : ""}>
          土日の日付を色分けする（土=青 / 日=赤）
        </label>
        <label class="check">
          <input type="checkbox" name="holidayDateColor" ${calendar.settings.holidayDateColor ? "checked" : ""}>
          日本の祝日の日付を赤くする
        </label>
        <label class="check">
          <input type="checkbox" name="condenseText" ${calendar.settings.condenseText ? "checked" : ""}>
          長い文字を長体で収める
        </label>
        <fieldset class="weekday-set">
          <legend>定休日（毎週）</legend>
          <div class="weekday-checks">
            ${WEEKDAY_OPTIONS.map(([ value, label ]) => `
              <label>
                <input type="checkbox" name="closedWeekday" value="${value}" ${calendar.settings.closedWeekdays.map(Number).includes(value) ? "checked" : ""}>
                ${label}
              </label>
            `).join("")}
          </div>
        </fieldset>
      </section>

      <section class="panel">
        <h3>タグ</h3>
        <ul class="tag-admin">
          ${this.tags.map((tag) => `
            <li class="tag-admin-item" data-tag-id="${tag.id}">
              <input type="color" name="tag-bg" value="${escapeAttr(tag.bg_color)}" title="背景色">
              <input type="text" name="tag-name" value="${escapeAttr(tag.name)}" maxlength="30">
              <button type="button" class="btn btn-tiny" data-tag-action="save">更新</button>
              <button type="button" class="btn btn-tiny btn-danger-ghost" data-tag-action="delete">削除</button>
            </li>
          `).join("")}
        </ul>
        <div class="tag-create">
          <input type="text" name="new-tag-name" placeholder="新しいタグ名" maxlength="30">
          <input type="color" name="new-tag-bg" value="#F5D000">
          <button type="button" class="btn btn-tiny" data-tag-action="create">追加</button>
        </div>
      </section>
    `
  }

  renderDayEditor(selected) {
    if (!selected) {
      return `<p class="hint">カレンダーの日付をクリックすると、イベントや定休日を編集できます。</p>`
    }

    const holidayNote = selected.holidayName
      ? `<p class="holiday-note">日本の祝日: ${selected.holidayName}</p>`
      : ""

    const eventsHtml = selected.events.map((event, index) => `
      <div class="event-editor" data-event-id="${event.id}">
        <div class="event-editor-row">
          <input type="text" name="event-time" value="${escapeAttr(event.time)}" placeholder="15:00">
          <select name="event-tag">
            <option value="">タグなし</option>
            ${this.tags.map((tag) => `
              <option value="${tag.id}" ${String(tag.id) === String(event.tagId) ? "selected" : ""}>${escapeAttr(tag.name)}</option>
            `).join("")}
          </select>
          <button type="button" class="btn btn-tiny btn-danger-ghost" data-event-action="remove" data-index="${index}">削除</button>
        </div>
        <input type="text" name="event-title" value="${escapeAttr(event.title)}" placeholder="イベント名">
      </div>
    `).join("")

    return `
      ${holidayNote}
      <div class="mode-tabs">
        <label><input type="radio" name="day-mode" value="events" ${selected.mode === "events" ? "checked" : ""}> イベント</label>
        <label><input type="radio" name="day-mode" value="closed" ${selected.mode === "closed" ? "checked" : ""}> 休み</label>
      </div>
      <label class="field">
        <span>休みラベル</span>
        <input type="text" name="closed-label" value="${escapeAttr(selected.closedLabel)}" list="closed-label-presets" ${selected.mode === "closed" ? "" : "disabled"}>
        <datalist id="closed-label-presets">
          <option value="定休日"></option>
          <option value="振替休日"></option>
        </datalist>
      </label>
      <label class="field">
        <span>日付カラー</span>
        <select name="holiday-color">
          <option value="auto" ${selected.holidayColor == null ? "selected" : ""}>自動（土日・祝日設定に従う）</option>
          <option value="on" ${selected.holidayColor === true ? "selected" : ""}>休日カラー（赤）</option>
          <option value="off" ${selected.holidayColor === false ? "selected" : ""}>通常カラー</option>
        </select>
      </label>
      <div class="day-actions">
        <button type="button" class="btn btn-ghost" data-day-action="copy">この日をコピー</button>
        <button type="button" class="btn btn-ghost" data-day-action="paste" ${this.clipboard ? "" : "disabled"}>貼り付け</button>
      </div>
      <div class="event-list">
        ${selected.mode === "events" ? eventsHtml : `<p class="hint">休みの日は中央にラベルだけ表示されます。</p>`}
      </div>
      ${selected.mode === "events" ? `<button type="button" class="btn btn-ghost btn-block" data-event-action="add">イベントを追加</button>` : ""}
    `
  }

  onPreviewClick(event) {
    const cell = event.target.closest("[data-day]")
    if (!cell) return
    const day = Number(cell.dataset.day)

    if (this.clipboard && (event.altKey || (this.pendingPaste && day !== this.pendingPasteFrom))) {
      this.pasteTo(day)
      this.pendingPaste = false
      return
    }

    this.selectedDay = day
    this.renderAll()
  }

  onSidebarInput(event) {
    const { name, value } = event.target
    if (name === "title") {
      this.calendar.title = value
      this.renderPreview()
      this.markDirty()
    }
    if (name === "closed-label" && this.selectedDay) {
      this.writeDay(this.selectedDay, { mode: "closed", closedLabel: value })
      this.renderPreview()
      this.markDirty()
    }
    if (name === "event-time" || name === "event-title") {
      this.updateEventFromInput(event.target)
    }
  }

  onSidebarChange(event) {
    const target = event.target
    const { name, value, checked } = target

    if (name === "month") {
      this.changeMonth(value)
      return
    }
    if (name === "showHeader" || name === "weekendDateColor" || name === "holidayDateColor" || name === "condenseText") {
      this.calendar.settings[name] = checked
      this.renderAll()
      this.markDirty()
      return
    }
    if (name === "closedWeekday") {
      const selected = [ ...this.sidebar.querySelectorAll("[name='closedWeekday']:checked") ].map((el) => Number(el.value))
      this.calendar.settings.closedWeekdays = selected
      this.renderAll()
      this.markDirty()
      return
    }
    if (name === "day-mode" && this.selectedDay) {
      this.writeDay(this.selectedDay, { mode: value, closedLabel: this.calendar.days[String(this.selectedDay)]?.closedLabel || "定休日" })
      this.renderAll()
      this.markDirty()
      return
    }
    if (name === "holiday-color" && this.selectedDay) {
      const holidayColor = value === "auto" ? null : value === "on"
      this.writeDay(this.selectedDay, { holidayColor })
      this.renderPreview()
      this.markDirty()
      return
    }
    if (name === "event-tag") {
      this.updateEventFromInput(target)
    }
  }

  async onSidebarClick(event) {
    const tagAction = event.target.dataset.tagAction
    if (tagAction) {
      await this.handleTagAction(tagAction, event.target)
      return
    }

    const dayAction = event.target.dataset.dayAction
    if (dayAction === "copy") this.copySelected()
    if (dayAction === "paste") this.pasteTo(this.selectedDay)

    const eventAction = event.target.dataset.eventAction
    if (eventAction === "add") this.addEvent()
    if (eventAction === "remove") this.removeEvent(event.target.closest(".event-editor")?.dataset.eventId)
  }

  updateEventFromInput(input) {
    const wrap = input.closest(".event-editor")
    if (!wrap || !this.selectedDay) return
    const events = deepClone(this.selectedState().events)
    const event = events.find((item) => item.id === wrap.dataset.eventId)
    if (!event) return
    if (input.name === "event-time") event.time = input.value
    if (input.name === "event-title") event.title = input.value
    if (input.name === "event-tag") event.tagId = input.value ? Number(input.value) : null
    this.writeDay(this.selectedDay, { mode: "events", events })
    this.renderPreview()
    this.markDirty()
  }

  addEvent() {
    if (!this.selectedDay) return
    const events = [ ...this.selectedState().events, newEvent() ]
    this.writeDay(this.selectedDay, { mode: "events", events })
    this.renderAll()
    this.markDirty()
    this.sidebar.querySelector(".event-editor:last-of-type [name='event-title']")?.focus()
  }

  removeEvent(eventId) {
    if (!this.selectedDay || !eventId) return
    const events = this.selectedState().events.filter((event) => event.id !== eventId)
    this.writeDay(this.selectedDay, { events })
    this.renderAll()
    this.markDirty()
  }

  copySelected() {
    const selected = this.selectedState()
    if (!selected) return
    this.clipboard = cloneDayPayload(selected)
    this.pendingPaste = true
    this.pendingPasteFrom = selected.day
    this.renderSidebar()
    this.setStatus(`${this.calendar.month}/${selected.day} をコピーしました。貼り付け先の日付をクリック`, "info")
  }

  pasteTo(day) {
    if (!this.clipboard || !day) return
    this.writeDay(day, cloneDayPayload({
      ...this.clipboard,
      events: this.clipboard.events
    }))
    this.selectedDay = day
    this.renderAll()
    this.markDirty()
  }

  onKeydown(event) {
    const typing = [ "INPUT", "TEXTAREA", "SELECT" ].includes(event.target.tagName)
    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
      event.preventDefault()
      this.save()
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "c" && !typing) {
      event.preventDefault()
      this.copySelected()
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "v" && !typing) {
      event.preventDefault()
      this.pasteTo(this.selectedDay)
    }
  }

  async changeMonth(value) {
    const [ year, month ] = value.split("-").map(Number)
    if (year === this.calendar.year && month === this.calendar.month) return
    const hasContent = Object.values(this.calendar.days).some((day) => day.events?.length || day.mode)
    if (hasContent && !window.confirm("月を変えると各日の内容はリセットされます。続行しますか？")) {
      this.renderSidebar()
      return
    }
    this.calendar.year = year
    this.calendar.month = month
    this.calendar.days = {}
    this.selectedDay = null
    if (!this.calendar.title || /月大会スケジュール$/.test(this.calendar.title)) {
      this.calendar.title = defaultTitle(month)
    }
    this.holidays = await fetchHolidays(year, month)
    this.renderAll()
    this.markDirty()
  }

  async handleTagAction(action, button) {
    try {
      if (action === "create") {
        const name = this.sidebar.querySelector("[name='new-tag-name']").value.trim()
        const bg = this.sidebar.querySelector("[name='new-tag-bg']").value
        if (!name) return
        const tag = await createTag({ name, bg_color: bg, text_color: contrastText(bg) })
        this.tags = [ ...this.tags, tag ]
      }
      if (action === "save") {
        const item = button.closest("[data-tag-id]")
        const tag = await updateTag(item.dataset.tagId, {
          name: item.querySelector("[name='tag-name']").value.trim(),
          bg_color: item.querySelector("[name='tag-bg']").value,
          text_color: contrastText(item.querySelector("[name='tag-bg']").value)
        })
        this.tags = this.tags.map((itemTag) => String(itemTag.id) === String(tag.id) ? tag : itemTag)
      }
      if (action === "delete") {
        const item = button.closest("[data-tag-id]")
        if (!window.confirm("このタグを削除しますか？イベントからは外れます。")) return
        await deleteTag(item.dataset.tagId)
        const removedId = Number(item.dataset.tagId)
        this.tags = this.tags.filter((tag) => tag.id !== removedId)
        Object.values(this.calendar.days).forEach((day) => {
          (day.events || []).forEach((event) => {
            if (Number(event.tagId) === removedId) event.tagId = null
          })
        })
        this.markDirty()
      }
      this.renderAll()
    } catch (error) {
      window.alert(error.message)
    }
  }

  async save() {
    if (this.saving) return
    this.saving = true
    this.setStatus("保存中...", "busy")
    try {
      const body = payloadFrom(this.calendar)
      const saved = this.calendar.id
        ? await updateCalendar(this.calendar.id, body)
        : await createCalendar(body)
      this.calendar = this.normalizeCalendar(saved)
      this.dirty = false
      this.setStatus("保存済み", "saved")
      if (!this.routes.calendar) {
        history.replaceState({}, "", `/calendars/${this.calendar.id}`)
        this.routes.calendar = `/calendars/${this.calendar.id}`
      }
    } catch (error) {
      this.setStatus(error.message, "error")
    } finally {
      this.saving = false
    }
  }

  async exportPng() {
    this.setStatus("画像を書き出し中...", "busy")
    try {
      const dataUrl = await exportCalendarPng(this.calendar, this.tags, this.holidays)
      downloadDataUrl(dataUrl, `${this.calendar.year}-${String(this.calendar.month).padStart(2, "0")}.png`)
      this.setStatus(this.dirty ? "未保存" : "保存済み", this.dirty ? "dirty" : "saved")
    } catch (error) {
      this.setStatus(error.message, "error")
    }
  }
}

function contrastText(hex) {
  const value = hex.replace("#", "")
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value
  const n = Number.parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.65 ? "#111111" : "#ffffff"
}

export function createEditor(root, bootstrap) {
  return new CalendarEditor(root, bootstrap)
}
