import { type SubmitEvent, useEffect, useId, useRef, useState } from 'react'
import { MAX_DATES, MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH, MAX_TODOS, type TodoDate } from './storage.ts'
import {
  type FormErrors,
  formatDate,
  fromPickerValue,
  toPickerValue,
  type TodoDraft,
  validateForm,
} from './todoForm.ts'
import { closeOnEscape, useModalDialog } from './useModalDialog.ts'

interface TodoFormDialogProps {
  // The todo being edited; left out for a new one
  initial?: TodoDraft | undefined
  // true when the last valid save could not be stored
  hasSaveFailed?: boolean
  // true for a new todo when there are already MAX_TODOS; the app then refuses to save it
  isLimitReached?: boolean
  onSave: (draft: TodoDraft) => void
  onClose: () => void
}

// Each date field keeps its key when others are removed, so its text and date picker stay with it
interface DateRow {
  key: number
  text: string
}

const NO_ERRORS: FormErrors = { title: undefined, description: undefined, dates: [], group: undefined }

const dateName = (index: number) => `date-${String(index + 1)}`

const byCalendar = (a: TodoDate, b: TodoDate) => a.month - b.month || a.day - b.day

// One row per stored date, in calendar order, or a single empty row for a new todo
function initialRows(initial: TodoDraft | undefined): DateRow[] {
  if (!initial) return [{ key: 0, text: '' }]
  return [...initial.dates].sort(byCalendar).map((date, key) => ({ key, text: formatDate(date) }))
}

function firstInvalidField(errors: FormErrors): string | undefined {
  if (errors.title !== undefined) return 'title'
  if (errors.description !== undefined) return 'description'
  const index = errors.dates.findIndex((error) => error !== undefined)
  if (index !== -1) return dateName(index)
  return errors.group === undefined ? undefined : dateName(0)
}

// The form is mounted when it opens and unmounted when it closes, so it always starts from `initial`
export default function TodoFormDialog({
  initial,
  hasSaveFailed = false,
  isLimitReached = false,
  onSave,
  onClose,
}: TodoFormDialogProps) {
  const dialogRef = useModalDialog()
  const formRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState(() => initialRows(initial))
  const nextKey = useRef(rows.length)
  // The date field to focus once the list has been drawn after adding or removing one
  const focusIndex = useRef<number | null>(null)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isSubmitted, setSubmitted] = useState(false)
  const id = useId()

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    if (focusIndex.current === null) return
    const field = formRef.current?.elements.namedItem(dateName(focusIndex.current))
    focusIndex.current = null
    if (field instanceof HTMLElement) field.focus()
  }, [rows])

  const setRowText = (key: number, text: string) => {
    setRows((current) => current.map((row) => (row.key === key ? { key, text } : row)))
  }

  const addRow = () => {
    focusIndex.current = rows.length
    setRows([...rows, { key: nextKey.current++, text: '' }])
  }

  const removeRow = (index: number) => {
    focusIndex.current = Math.max(0, index - 1)
    setRows(rows.filter((_, i) => i !== index))
  }

  const values = { title, description, dates: rows.map((row) => row.text) }
  // After the first attempt to save, the errors follow the fields, so they go away as soon as a field is corrected
  const checked = isSubmitted ? validateForm(values) : undefined
  const errors = checked && !checked.ok ? checked.errors : NO_ERRORS

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    const result = validateForm(values)
    if (result.ok) {
      onSave(result.draft)
      return
    }
    const first = firstInvalidField(result.errors)
    const element = first && event.currentTarget.elements.namedItem(first)
    if (element instanceof HTMLElement) element.focus()
  }

  const errorId = (field: string) => `${id}-${field}-error`

  return (
    <dialog ref={dialogRef} aria-labelledby={`${id}-heading`} onClose={onClose} onCancel={closeOnEscape(onClose)}>
      <form ref={formRef} className="dlg" noValidate onSubmit={submit}>
        <button type="button" className="btn close" aria-label="Lukk" onClick={onClose}>
          ×
        </button>
        <h2 id={`${id}-heading`}>{initial ? 'Rediger gjøremål' : 'Nytt gjøremål'}</h2>
        <div className="field">
          <div className="label-row">
            <label htmlFor={`${id}-title`}>Tittel</label>
            <Counter text={title} max={MAX_TITLE_LENGTH} />
          </div>
          <input
            ref={titleRef}
            id={`${id}-title`}
            name="title"
            type="text"
            autoComplete="off"
            value={title}
            aria-invalid={errors.title !== undefined}
            aria-describedby={errorId('title')}
            onChange={(event) => {
              setTitle(event.target.value)
            }}
          />
          <FieldError id={errorId('title')} message={errors.title} />
        </div>
        <div className="field">
          <div className="label-row">
            <label htmlFor={`${id}-description`}>
              Beskrivelse <span className="optional">(valgfri)</span>
            </label>
            <Counter text={description} max={MAX_DESCRIPTION_LENGTH} />
          </div>
          <textarea
            id={`${id}-description`}
            name="description"
            rows={4}
            value={description}
            aria-invalid={errors.description !== undefined}
            aria-describedby={errorId('description')}
            onChange={(event) => {
              setDescription(event.target.value)
            }}
          />
          <FieldError id={errorId('description')} message={errors.description} />
        </div>
        <fieldset className="field" aria-describedby={`${id}-date-hint`}>
          <legend>Datoer</legend>
          <p className="hint" id={`${id}-date-hint`}>
            Skriv dd.mm (eller dd/mm, dd-mm), eller velg i kalenderen. Gjentas hvert år.
          </p>
          <ol className="date-list">
            {rows.map((row, index) => (
              <DateField
                key={row.key}
                index={index}
                value={row.text}
                error={errors.dates[index]}
                errorId={errorId(`date-${String(row.key)}`)}
                groupErrorId={errorId('dates')}
                isGroupInvalid={errors.group !== undefined}
                onChange={(text) => {
                  setRowText(row.key, text)
                }}
                onRemove={
                  rows.length > 1
                    ? () => {
                        removeRow(index)
                      }
                    : undefined
                }
              />
            ))}
          </ol>
          <FieldError id={errorId('dates')} message={errors.group} />
          {rows.length < MAX_DATES ? (
            <button type="button" className="btn dashed" onClick={addRow}>
              + Legg til ekstra dato
            </button>
          ) : (
            <p className="hint">Maks {MAX_DATES} datoer per gjøremål.</p>
          )}
        </fieldset>
        {isLimitReached && (
          <p className="dlg-error" role="alert">
            Du kan ha maks {MAX_TODOS} gjøremål. Slett et gjøremål før du legger til et nytt.
          </p>
        )}
        {hasSaveFailed && (
          <p className="dlg-error" role="alert">
            Kunne ikke lagre. Lagringen i nettleseren er full eller blokkert.
          </p>
        )}
        <div className="dlg-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Avbryt
          </button>
          <button type="submit" className="btn primary">
            Lagre
          </button>
        </div>
      </form>
    </dialog>
  )
}

interface DateFieldProps {
  index: number
  value: string
  error: string | undefined
  errorId: string
  groupErrorId: string
  isGroupInvalid: boolean
  onChange: (value: string) => void
  // Left out when this is the only date, since at least one is required
  onRemove: (() => void) | undefined
}

// A text field for dd.mm, and a calendar button that opens the browser's own date picker
function DateField({ index, value, error, errorId, groupErrorId, isGroupInvalid, onChange, onRemove }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)
  const n = String(index + 1)
  // Only the messages that are shown, so a screen reader does not read an empty one
  const describedBy = [error === undefined ? '' : errorId, isGroupInvalid ? groupErrorId : ''].join(' ').trim() || undefined

  const openPicker = () => {
    const picker = pickerRef.current
    if (!picker) return
    picker.value = toPickerValue(value, new Date().getFullYear())
    // Safari closes its picker only when the field it belongs to loses focus, so the field must have it
    picker.focus()
    try {
      picker.showPicker()
    } catch {
      // Some browsers refuse to show the picker; the focus lets the user open it from the keyboard
    }
  }

  return (
    <li className="date-row">
      <div className="date-line">
        <input
          ref={inputRef}
          name={dateName(index)}
          type="text"
          inputMode="numeric"
          placeholder="dd.mm"
          aria-label={`Dato ${n}`}
          value={value}
          aria-invalid={error !== undefined || isGroupInvalid}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
        <button type="button" className="btn icon" aria-label={`Velg dato ${n} i kalender`} onClick={openPicker}>
          <CalendarIcon />
        </button>
        <input
          ref={pickerRef}
          type="date"
          className="picker"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const text = fromPickerValue(event.target.value)
            if (text === '') return
            onChange(text)
            inputRef.current?.focus()
          }}
        />
        {onRemove && (
          <button type="button" className="btn link" aria-label={`Fjern dato ${n}`} onClick={onRemove}>
            Fjern
          </button>
        )}
      </div>
      <FieldError id={errorId} message={error} />
    </li>
  )
}

// Counts like the validation does, without spaces at the ends. It is shown, but not read out with the
// field: going over the limit gives an error message, which is read out.
function Counter({ text, max }: { text: string; max: number }) {
  const length = text.trim().length
  return <span className={`counter${length > max ? ' over' : ''}`}>{`${String(length)}/${String(max)}`}</span>
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return (
    <p className="field-error" id={id}>
      {message}
    </p>
  )
}

function CalendarIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x={3} y={5} width={18} height={16} rx={2} />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}
