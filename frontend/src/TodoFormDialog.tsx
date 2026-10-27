import { type SubmitEvent, useEffect, useId, useRef, useState } from 'react'
import { type FormErrors, type FormValues, fromPickerValue, toPickerValue, type TodoDraft, validateForm } from './todoForm.ts'

interface TodoFormDialogProps {
  onSave: (draft: TodoDraft) => void
  onClose: () => void
}

const EMPTY: FormValues = { title: '', description: '', date: '' }
const NO_ERRORS: FormErrors = { title: undefined, description: undefined, date: undefined }
const FIELD_ORDER: readonly (keyof FormValues)[] = ['title', 'description', 'date']

// The form is mounted when it opens and unmounted when it closes, so it always starts empty
export default function TodoFormDialog({ onSave, onClose }: TodoFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState(NO_ERRORS)
  const id = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    // StrictMode runs the effect twice in development, and showModal() on an open dialog throws
    if (dialog && !dialog.open) dialog.showModal()
    titleRef.current?.focus()
  }, [])

  const setValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateForm(values)
    setErrors(result.ok ? NO_ERRORS : result.errors)
    if (result.ok) {
      onSave(result.draft)
      return
    }
    const first = FIELD_ORDER.find((field) => result.errors[field] !== undefined)
    const element = first && event.currentTarget.elements.namedItem(first)
    if (element instanceof HTMLElement) element.focus()
  }

  const errorId = (field: keyof FormValues) => `${id}-${field}-error`

  return (
    <dialog ref={dialogRef} aria-labelledby={`${id}-heading`} onClose={onClose}>
      <form className="dlg" noValidate onSubmit={submit}>
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
            value={values.title}
            aria-invalid={errors.title !== undefined}
            aria-describedby={errorId('title')}
            onChange={(event) => {
              setValue('title', event.target.value)
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
            value={values.description}
            aria-invalid={errors.description !== undefined}
            aria-describedby={errorId('description')}
            onChange={(event) => {
              setValue('description', event.target.value)
            }}
          />
          <FieldError id={errorId('description')} message={errors.description} />
        </div>
        <fieldset className="field" aria-describedby={`${id}-date-hint`}>
          <legend>Datoer</legend>
          <p className="hint" id={`${id}-date-hint`}>
            Skriv dd.mm (eller dd/mm, dd-mm), eller velg i kalenderen. Gjentas hvert år.
          </p>
          <DateField
            value={values.date}
            error={errors.date}
            errorId={errorId('date')}
            onChange={(value) => {
              setValue('date', value)
            }}
          />
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
  value: string
  error: string | undefined
  errorId: string
  onChange: (value: string) => void
}

// A text field for dd.mm, and a calendar button that opens the browser's own date picker
function DateField({ value, error, errorId, onChange }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    const picker = pickerRef.current
    if (!picker) return
    picker.value = toPickerValue(value, new Date().getFullYear())
    try {
      picker.showPicker()
    } catch {
      // Some browsers refuse to show the picker; focus lets the user open it from the keyboard
      picker.focus()
    }
  }

  return (
    <div className="date-row">
      <div className="date-line">
        <input
          ref={inputRef}
          name="date"
          type="text"
          inputMode="numeric"
          placeholder="dd.mm"
          aria-label="Dato 1"
          value={value}
          aria-invalid={error !== undefined}
          aria-describedby={errorId}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
        <button type="button" className="btn icon" aria-label="Velg dato 1 i kalender" onClick={openPicker}>
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
      </div>
      <FieldError id={errorId} message={error} />
    </div>
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
