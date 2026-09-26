import { Controller } from "@hotwired/stimulus"
import { createEditor } from "calendar/editor"

export default class extends Controller {
  save(event) {
    event.preventDefault()
    this.editor?.save()
  }

  exportPng(event) {
    event.preventDefault()
    this.editor?.exportPng()
  }

  connect() {
    const bootstrap = JSON.parse(document.getElementById("editor-bootstrap").textContent)
    this.editor = createEditor(this.element, bootstrap)
    this.editor.setStatus(bootstrap.calendar.id ? "保存済み" : "未保存", bootstrap.calendar.id ? "saved" : "dirty")
  }

  disconnect() {
    this.editor?.destroy()
  }
}
