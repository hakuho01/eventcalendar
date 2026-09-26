function csrfToken() {
  return document.querySelector("meta[name='csrf-token']")?.content
}

async function request(url, options = {}) {
  const headers = {
    Accept: "application/json",
    "X-CSRF-Token": csrfToken(),
    ...options.headers
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
    options.body = JSON.stringify(options.body)
  }

  const response = await fetch(url, { ...options, headers })
  if (response.status === 204) return null

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data.errors?.join("\n") || `保存に失敗しました (${response.status})`
    throw new Error(message)
  }
  return data
}

export function createCalendar(payload) {
  return request("/calendars", { method: "POST", body: { calendar: payload } })
}

export function updateCalendar(id, payload) {
  return request(`/calendars/${id}`, { method: "PATCH", body: { calendar: payload } })
}

export function fetchHolidays(year, month) {
  return request(`/holidays?year=${year}&month=${month}`)
}

export function createTag(payload) {
  return request("/tags", { method: "POST", body: { tag: payload } })
}

export function updateTag(id, payload) {
  return request(`/tags/${id}`, { method: "PATCH", body: { tag: payload } })
}

export function deleteTag(id) {
  return request(`/tags/${id}`, { method: "DELETE" })
}
