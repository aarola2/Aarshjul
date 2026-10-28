export interface TodoDate {
  month: number
  day: number
}

export interface Todo {
  id: string
  title: string
  description: string
  dates: TodoDate[]
  createdAt: string
}

// raw is the stored text exactly as it was, so a copy of it can be kept. blocked: the browser does not allow storage.
export type LoadResult = { status: 'ok'; todos: Todo[] } | { status: 'corrupt'; raw: string } | { status: 'blocked' }

export const STORAGE_KEY = 'aarhjul:v1:todos'
// The newest copy of corrupt data, and the first one, which the app never overwrites
export const CORRUPT_COPY_KEY = 'aarhjul:v1:corrupt-copy'
export const FIRST_CORRUPT_COPY_KEY = 'aarhjul:v1:corrupt-copy-first'
export const MAX_TITLE_LENGTH = 60
export const MAX_DESCRIPTION_LENGTH = 500
export const MAX_DATES = 12
// Far more than anyone needs, and still quick to draw: 250 todos with 12 dates each are placed in about 10 ms,
// and about 0.45 s in the worst case, with all dates within a few days of each other (500 took 3.3 s).
// Without a limit, a few thousand valid todos, from a bug or another page on the same origin, freeze the tab.
export const MAX_TODOS = 250
// Ids made by the app are 36 characters (crypto.randomUUID)
export const MAX_ID_LENGTH = 64

// February has 29 days so that 29 February can be stored all years.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const TODO_KEYS = ['id', 'title', 'description', 'dates', 'createdAt']
const DATE_KEYS = ['month', 'day']

// Returns false when storage refuses it, because it is full or blocked, so the app can keep what is shown as it was
export function saveTodos(todos: readonly Todo[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
    return true
  } catch {
    return false
  }
}

export function loadTodos(): LoadResult {
  const raw = readStored()
  if (raw === undefined) return { status: 'blocked' }
  if (raw === null) return { status: 'ok', todos: [] }
  const parsed = parseJson(raw)
  return isTodoList(parsed) ? { status: 'ok', todos: parsed } : { status: 'corrupt', raw }
}

// Kept under its own key, which saveTodos never writes to. A different earlier copy is first moved aside, once,
// so a later corrupt value cannot overwrite it. Returns false when storage refuses it, for example when it is
// full, so the app can go on without it; the earlier copy is then left as it was.
export function keepCorruptCopy(raw: string): boolean {
  try {
    const current = localStorage.getItem(CORRUPT_COPY_KEY)
    if (current !== null && current !== raw && localStorage.getItem(FIRST_CORRUPT_COPY_KEY) === null) {
      localStorage.setItem(FIRST_CORRUPT_COPY_KEY, current)
    }
    localStorage.setItem(CORRUPT_COPY_KEY, raw)
    return true
  } catch {
    return false
  }
}

// The oldest kept copy that differs from the corrupt data shown now, for the user to download; null if none.
// It is only ever offered as a file, never read as todos or shown.
export function olderCorruptCopy(raw: string): string | null {
  try {
    const copies = [localStorage.getItem(FIRST_CORRUPT_COPY_KEY), localStorage.getItem(CORRUPT_COPY_KEY)]
    return copies.find((copy) => copy !== null && copy !== raw) ?? null
  } catch {
    return null
  }
}

// undefined when the browser blocks storage for the site; then even reaching localStorage throws
function readStored(): string | null | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return undefined
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function isTodoList(value: unknown): value is Todo[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_TODOS &&
    value.every(isTodo) &&
    isUnique(value.map((todo) => todo.id))
  )
}

function isTodo(value: unknown): value is Todo {
  if (!hasExactKeys(value, TODO_KEYS)) return false
  const { id, title, description, dates, createdAt } = value
  return (
    typeof id === 'string' &&
    id !== '' &&
    id.length <= MAX_ID_LENGTH &&
    typeof title === 'string' &&
    title.length >= 1 &&
    title.length <= MAX_TITLE_LENGTH &&
    typeof description === 'string' &&
    description.length <= MAX_DESCRIPTION_LENGTH &&
    isDateList(dates) &&
    isTimestamp(createdAt)
  )
}

function isDateList(value: unknown): value is TodoDate[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= MAX_DATES &&
    value.every(isTodoDate) &&
    isUnique(value.map((date) => `${String(date.month)}.${String(date.day)}`))
  )
}

function isTodoDate(value: unknown): value is TodoDate {
  if (!hasExactKeys(value, DATE_KEYS)) return false
  const { month, day } = value
  if (typeof month !== 'number' || typeof day !== 'number') return false
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false
  const maxDay = DAYS_IN_MONTH[month - 1]
  return maxDay !== undefined && day >= 1 && day <= maxDay
}

// Only the exact format written by Date.toISOString() is accepted.
function isTimestamp(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const time = Date.parse(value)
  return !Number.isNaN(time) && new Date(time).toISOString() === value
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every((key) => actual.includes(key))
}

function isUnique(values: readonly string[]): boolean {
  return new Set(values).size === values.length
}
