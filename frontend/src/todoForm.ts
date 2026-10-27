import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH, type Todo, type TodoDate } from './storage.ts'
import { daysInMonth } from './wheelGeometry.ts'

export interface FormValues {
  title: string
  description: string
  date: string
}

// undefined means the field has no error
export type FormErrors = Record<keyof FormValues, string | undefined>

export type TodoDraft = Pick<Todo, 'title' | 'description' | 'dates'>

export type FormResult = { ok: true; draft: TodoDraft } | { ok: false; errors: FormErrors }

// dd.mm, dd/mm or dd-mm, with an optional full stop at the end
const DATE_PATTERN = /^\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\s*\.?\s*$/
// A leap year, so that 29 February is allowed
const LEAP_YEAR = 2024

const pad = (value: number) => String(value).padStart(2, '0')

export function parseDate(text: string): TodoDate | null {
  const match = DATE_PATTERN.exec(text)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month, LEAP_YEAR)) return null
  return { month, day }
}

function titleError(title: string): string | undefined {
  if (title === '') return 'Tittel er påkrevd.'
  if (title.length > MAX_TITLE_LENGTH) return `Tittelen kan ha maks ${String(MAX_TITLE_LENGTH)} tegn.`
  return undefined
}

function descriptionError(description: string): string | undefined {
  return description.length > MAX_DESCRIPTION_LENGTH
    ? `Beskrivelsen kan ha maks ${String(MAX_DESCRIPTION_LENGTH)} tegn.`
    : undefined
}

// The guard keeps values that storage would reject out of it. The precise calendar messages come in #17.
function dateError(text: string, date: TodoDate | null): string | undefined {
  if (text.trim() === '') return 'Minst én dato er påkrevd.'
  if (date === null) return 'Skriv datoen som dd.mm, for eksempel 15.05.'
  return undefined
}

export function validateForm(values: FormValues): FormResult {
  const title = values.title.trim()
  const description = values.description.trim()
  const date = parseDate(values.date)
  const errors: FormErrors = {
    title: titleError(title),
    description: descriptionError(description),
    date: dateError(values.date, date),
  }
  if (date === null || errors.title !== undefined || errors.description !== undefined) return { ok: false, errors }
  return { ok: true, draft: { title, description, dates: [date] } }
}

// A new id is drawn until it is not used by any stored todo
export function createTodo(
  draft: TodoDraft,
  existing: readonly Todo[],
  now: Date,
  newId: () => string = () => crypto.randomUUID(),
): Todo {
  const used = new Set(existing.map((todo) => todo.id))
  let id = newId()
  while (used.has(id)) id = newId()
  return { id, ...draft, createdAt: now.toISOString() }
}

// The native date picker works with yyyy-mm-dd in a given year
export function toPickerValue(text: string, year: number): string {
  const date = parseDate(text)
  return date ? `${String(year)}-${pad(date.month)}-${pad(date.day)}` : ''
}

export function fromPickerValue(value: string): string {
  const [, month, day] = value.split('-')
  return month && day ? `${day}.${month}` : ''
}
