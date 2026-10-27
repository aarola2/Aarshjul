import { type SubmitEvent, useEffect, useId, useRef, useState } from 'react'
import { MAX_DATES } from './storage.ts'
import { type FormErrors, fromPickerValue, toPickerValue, type TodoDraft, validateForm } from './todoForm.ts'

interface TodoFormDialogProps {
  onSave: (draft: TodoDraft) => void
  onClose: () => void
}

// Each date field keeps its key when others are removed, so its text and error stay with it
interface DateRow {
  key: number
  text: string
}

interface ShownErrors {
  title: string | undefined
  description: string | undefined
  group: string | undefined
  byRow: ReadonlyMap<number, string | undefined>
}

const NO_ERRORS: ShownErrors = { title: undefined, description: undefined, group: undefined, byRow: new Map() }

const dateName = (index: number) => `date-${String(index + 1)}`

function firstInvalidField(errors: FormErrors): string | undefined {
  if (errors.title !== undefined) return 'title'
  if (errors.description !== undefined) return 'description'
  const index = errors.dates.findIndex((error) => error !== undefined)
  if (index !== -1) return dateName(index)
  return errors.group === undefined ? undefined : dateName(0)
}

// The form is mounted when it opens and unmounted when it closes, so it always starts empty
export default function TodoFormDialog({ onSave, onClose }: TodoFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const nextKey = useRef(1)
  // The date field to focus once the list has been drawn after adding or removing one
  const focusIndex = useRef<number | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [rows, setRows] = useState<DateRow[]>([{ key: 0, text: '' }])
  const [errors, setErrors] = useState(NO_ERRORS)
  const id = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    // StrictMode runs the effect twice in development, and showModal() on an open dialog throws
    if (dialog && !dialog.open) dialog.showModal()
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

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateForm({ title, description, dates: rows.map((row) => row.text) })
    if (result.ok) {
      setErrors(NO_ERRORS)
      onSave(result.draft)
      return
    }
    const { dates, ...rest } = result.errors
    setErrors({ ...rest, byRow: new Map(rows.map((row, i) => [row.key, dates[i]])) })
    const first = firstInvalidField(result.errors)
    const element = first && event.currentTarget.elements.namedItem(first)
    if (element instanceof HTMLElement) element.focus()
  }

  const errorId = (field: string) => `${id}-${field}-error`

  return (
    <dialog ref={dialogRef} aria-labelledby={`${id}-heading`} onClose={onClose}>
      <form ref={formRef} className="dlg" noValidate onSubmit={submit}>
        <button type="button" className="btn close" aria-label="Lukk" onClick={onClose}>
          ×
        </button>
        <h2 id={`${id}-heading`}>Nytt gjøremål</h2>
        <div className="field">
          <label htmlFor={`${id}-title`}>Tittel</label>
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
          <label htmlFor={`${id}-description`}>
            Beskrivelse <span className="optional">(valgfri)</span>
          </label>
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
                error={errors.byRow.get(row.key)}
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
