import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { CORRUPT_COPY_KEY, loadTodos, STORAGE_KEY } from './storage.ts'

describe('App', () => {
  it('viser overskriften Årshjul', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Årshjul' })).toBeInTheDocument()
  })

  it('viser underteksten i toppfeltet', () => {
    render(<App />)
    expect(screen.getByRole('banner')).toHaveTextContent('Faste gjøremål som kommer igjen hvert år')
  })

  it('viser hjulet og sidekolonnen «Denne måneden»', () => {
    render(<App />)
    expect(screen.getByRole('group', { name: 'Årshjul med gjøremål' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Denne måneden' })).toBeInTheDocument()
  })
})

describe('App, gjøremål fra lagringen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('viser en prikk per dato for lagrede gjøremål', () => {
    const todos = [
      { id: 'a1', title: 'Dekkskift', description: '', dates: [{ month: 4, day: 15 }, { month: 10, day: 15 }], createdAt: '2026-01-02T09:00:00.000Z' },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
    render(<App />)
    expect(screen.getAllByTestId('prikk')).toHaveLength(2)
  })

  it.each([
    ['tom lagring', null],
    ['ødelagte data', '[{"id":'],
  ])('viser hjulet uten prikker ved %s', (_name, raw) => {
    if (raw !== null) localStorage.setItem(STORAGE_KEY, raw)
    render(<App />)
    expect(screen.getByRole('group', { name: 'Årshjul med gjøremål' })).toBeInTheDocument()
    expect(screen.queryAllByTestId('prikk')).toHaveLength(0)
  })
})

describe('App, sidekolonnen for inneværende måned', () => {
  const todo = (id: string, title: string, ...dates: [number, number][]) => ({
    id,
    title,
    description: '',
    dates: dates.map(([month, day]) => ({ month, day })),
    createdAt: '2026-01-02T09:00:00.000Z',
  })

  beforeEach(() => {
    localStorage.clear()
    // Only Date is faked, so React keeps its own timers
    vi.useFakeTimers({ toFake: ['Date'] })
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        todo('m1', 'Vårvask', [3, 1]),
        todo('o2', 'Rense takrennene', [10, 20], [3, 2]),
        todo('o3', 'Dekkskift', [4, 15], [10, 5]),
        todo('n4', 'Julekort', [11, 1]),
      ]),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const cardTitles = () =>
    within(screen.getByRole('complementary', { name: 'Denne måneden' }))
      .queryAllByRole('article')
      .map((card) => within(card).getByRole('heading', { level: 3 }).textContent)

  it.each([
    ['oktober', new Date(2026, 9, 31, 23, 59), 'Oktober', ['Dekkskift', 'Rense takrennene']],
    ['november', new Date(2026, 10, 1, 0, 0), 'November', ['Julekort']],
    ['mars', new Date(2026, 2, 15), 'Mars', ['Vårvask', 'Rense takrennene']],
  ])('viser gjøremålene for %s ut fra nettleserens dato', (_name, now, heading, titles) => {
    vi.setSystemTime(now)
    render(<App />)
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
    expect(cardTitles()).toEqual(titles)
  })
})

describe('App, nytt gjøremål', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 12, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const openForm = () => {
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til nytt gjøremål' }))
    return screen.getByRole('dialog', { name: 'Nytt gjøremål' })
  }
  const fill = (title: string, date: string) => {
    fireEvent.change(screen.getByLabelText('Tittel'), { target: { value: title } })
    fireEvent.change(screen.getByLabelText('Dato 1'), { target: { value: date } })
  }
  const save = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Lagre' }))
  }
  const column = () => screen.getByRole('complementary', { name: 'Denne måneden' })

  it('har knappen «+ Legg til nytt gjøremål» i toppfeltet, og skjemaet er lukket fra start', () => {
    render(<App />)
    expect(within(screen.getByRole('banner')).getByRole('button', { name: '+ Legg til nytt gjøremål' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lagrer et gyldig gjøremål og viser det med en gang på hjulet og i sidekolonnen', () => {
    render(<App />)
    openForm()
    fill('Dekkskift', '15.10')
    save()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getAllByTestId('prikk')).toHaveLength(1)
    expect(within(column()).getByRole('heading', { level: 3, name: 'Dekkskift' })).toBeInTheDocument()
    const stored = loadTodos()
    expect(stored).toMatchObject({
      status: 'ok',
      todos: [{ title: 'Dekkskift', description: '', dates: [{ month: 10, day: 15 }], createdAt: new Date(2026, 9, 27, 12, 0).toISOString() }],
    })
  })

  it('legger det nye gjøremålet til de som er lagret fra før', () => {
    const before = [
      { id: 'a1', title: 'Vårvask', description: '', dates: [{ month: 5, day: 1 }], createdAt: '2026-01-02T09:00:00.000Z' },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(before))
    render(<App />)
    openForm()
    fill('Dekkskift', '15.10')
    save()
    const stored = loadTodos()
    expect(stored.status === 'ok' && stored.todos.map((todo) => todo.title)).toEqual(['Vårvask', 'Dekkskift'])
    expect(screen.getAllByTestId('prikk')).toHaveLength(2)
  })

  it.each([
    ['uten tittel', '', '15.10', 'Tittel er påkrevd.'],
    ['uten dato', 'Dekkskift', '', 'Minst én dato er påkrevd.'],
    ['med ugyldig dato', 'Dekkskift', '31.04', '31. april finnes ikke i kalenderen.'],
  ])('lagrer ingenting %s', (_name, title, date, message) => {
    render(<App />)
    openForm()
    fill(title, date)
    save()
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nytt gjøremål' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.queryAllByTestId('prikk')).toHaveLength(0)
  })

  it('lagrer et gjøremål med to datoer som to prikker og ett kort', () => {
    render(<App />)
    openForm()
    fill('Rense takrennene', '3.10')
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til ekstra dato' }))
    fireEvent.change(screen.getByLabelText('Dato 2'), { target: { value: '20.10' } })
    save()
    expect(screen.getAllByTestId('prikk')).toHaveLength(2)
    const cards = within(column()).getAllByRole('article')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveTextContent('3. okt20. okt')
    const stored = loadTodos()
    expect(stored.status === 'ok' && stored.todos[0]?.dates).toEqual([{ month: 10, day: 3 }, { month: 10, day: 20 }])
  })

  it('«Avbryt» lukker uten å lagre, og skjemaet er tomt neste gang', () => {
    render(<App />)
    openForm()
    fill('Dekkskift', '15.10')
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.queryAllByTestId('prikk')).toHaveLength(0)
    openForm()
    expect(screen.getByLabelText('Tittel')).toHaveValue('')
    expect(screen.getByLabelText('Dato 1')).toHaveValue('')
  })
})

describe('App, vise et gjøremål', () => {
  const TODOS = [
    {
      id: 'c3',
      title: 'Rense takrennene',
      description: 'Begge sider av huset.',
      dates: [{ month: 10, day: 3 }, { month: 3, day: 20 }],
      createdAt: '2026-01-02T09:00:00.000Z',
    },
    { id: 'a1', title: 'Dekkskift', description: '', dates: [{ month: 4, day: 15 }], createdAt: '2026-01-02T09:00:00.000Z' },
  ]

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(TODOS))
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 12, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const view = (title: string) => screen.getByRole('dialog', { name: title })

  it('er lukket fra start', () => {
    render(<App />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('åpner gjøremålet til prikken som klikkes', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Dekkskift, 15. april' }))
    expect(within(view('Dekkskift')).getByText('15. apr')).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('åpner samme dialog fra kortet, med alle datoene', () => {
    render(<App />)
    const column = screen.getByRole('complementary', { name: 'Denne måneden' })
    fireEvent.click(within(column).getByRole('article'))
    const dialog = view('Rense takrennene')
    expect(within(dialog).getByText('20. mar')).toBeInTheDocument()
    expect(within(dialog).getByText('3. okt')).toBeInTheDocument()
    expect(within(dialog).getByText('Begge sider av huset.')).toBeInTheDocument()
  })

  it('lukker dialogen uten å endre lagringen', () => {
    render(<App />)
    const before = localStorage.getItem(STORAGE_KEY)
    fireEvent.click(within(screen.getByRole('complementary', { name: 'Denne måneden' })).getByRole('article'))
    fireEvent.click(within(view('Rense takrennene')).getByRole('button', { name: 'Lukk' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
  })
})

describe('App, rediger', () => {
  const TODOS = [
    {
      id: 'c3',
      title: 'Rense takrennene',
      description: 'Begge sider av huset.',
      dates: [{ month: 10, day: 3 }, { month: 3, day: 20 }],
      createdAt: '2026-01-02T09:00:00.000Z',
    },
    { id: 'a1', title: 'Dekkskift', description: '', dates: [{ month: 10, day: 15 }], createdAt: '2026-02-03T10:00:00.000Z' },
  ]

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(TODOS))
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 12, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const column = () => screen.getByRole('complementary', { name: 'Denne måneden' })
  const editForm = () => screen.getByRole('dialog', { name: 'Rediger gjøremål' })
  const save = () => {
    fireEvent.click(within(editForm()).getByRole('button', { name: 'Lagre' }))
  }
  const stored = () => {
    const result = loadTodos()
    if (result.status !== 'ok') throw new Error('Lagringen kunne ikke leses')
    return result.todos
  }

  it('«Rediger» på kortet åpner skjemaet utfylt, uten visningen', () => {
    render(<App />)
    fireEvent.click(within(column()).getByRole('button', { name: 'Rediger «Rense takrennene»' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(within(editForm()).getByLabelText('Tittel')).toHaveValue('Rense takrennene')
    expect(within(editForm()).getByLabelText('Dato 1')).toHaveValue('20.03')
    expect(within(editForm()).getByLabelText('Dato 2')).toHaveValue('03.10')
  })

  it('«Rediger» i dialogen lukker visningen og åpner skjemaet utfylt', () => {
    render(<App />)
    fireEvent.click(within(column()).getAllByRole('article')[0] ?? column())
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Rense takrennene' })).getByRole('button', { name: 'Rediger' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(within(editForm()).getByLabelText(/Beskrivelse/)).toHaveValue('Begge sider av huset.')
  })

  it('«Lagre» oppdaterer lagringen, hjulet og sidekolonnen, og beholder id og tidspunkt', () => {
    render(<App />)
    fireEvent.click(within(column()).getByRole('button', { name: 'Rediger «Dekkskift»' }))
    fireEvent.change(within(editForm()).getByLabelText('Tittel'), { target: { value: 'Dekkskift til vinter' } })
    fireEvent.click(within(editForm()).getByRole('button', { name: '+ Legg til ekstra dato' }))
    fireEvent.change(within(editForm()).getByLabelText('Dato 2'), { target: { value: '1.4' } })
    save()

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(stored()).toEqual([
      TODOS[0],
      { ...TODOS[1], title: 'Dekkskift til vinter', dates: [{ month: 10, day: 15 }, { month: 4, day: 1 }] },
    ])
    expect(screen.getAllByTestId('prikk')).toHaveLength(4)
    expect(within(column()).getByRole('heading', { level: 3, name: 'Dekkskift til vinter' })).toBeInTheDocument()
    expect(within(column()).queryByRole('heading', { level: 3, name: 'Dekkskift' })).toBeNull()
  })

  it('lagrer ingenting når reglene brytes', () => {
    render(<App />)
    const before = localStorage.getItem(STORAGE_KEY)
    fireEvent.click(within(column()).getByRole('button', { name: 'Rediger «Dekkskift»' }))
    fireEvent.change(within(editForm()).getByLabelText('Tittel'), { target: { value: ' ' } })
    save()
    expect(within(editForm()).getByText('Tittel er påkrevd.')).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
  })

  it('«Avbryt» lukker uten endringer', () => {
    render(<App />)
    const before = localStorage.getItem(STORAGE_KEY)
    fireEvent.click(within(column()).getByRole('button', { name: 'Rediger «Dekkskift»' }))
    fireEvent.change(within(editForm()).getByLabelText('Tittel'), { target: { value: 'Noe annet' } })
    fireEvent.click(within(editForm()).getByRole('button', { name: 'Avbryt' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
    expect(within(column()).getByRole('heading', { level: 3, name: 'Dekkskift' })).toBeInTheDocument()
  })

  it('blander ikke nytt gjøremål med et lagret gjøremål som har id-en «new»', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...TODOS[1], id: 'new' }]))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til nytt gjøremål' }))
    expect(within(screen.getByRole('dialog', { name: 'Nytt gjøremål' })).getByLabelText('Tittel')).toHaveValue('')
  })

  it('gir et tomt skjema for nytt gjøremål etter en redigering', () => {
    render(<App />)
    fireEvent.click(within(column()).getByRole('button', { name: 'Rediger «Dekkskift»' }))
    save()
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til nytt gjøremål' }))
    const form = screen.getByRole('dialog', { name: 'Nytt gjøremål' })
    expect(within(form).getByLabelText('Tittel')).toHaveValue('')
    expect(stored()).toHaveLength(2)
  })
})

describe('App, slett', () => {
  const TODOS = [
    {
      id: 'c3',
      title: 'Rense takrennene',
      description: '',
      dates: [{ month: 10, day: 3 }, { month: 3, day: 20 }],
      createdAt: '2026-01-02T09:00:00.000Z',
    },
    { id: 'a1', title: 'Dekkskift', description: '', dates: [{ month: 10, day: 15 }], createdAt: '2026-02-03T10:00:00.000Z' },
  ]

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(TODOS))
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 12, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const column = () => screen.getByRole('complementary', { name: 'Denne måneden' })
  const confirm = () => screen.getByRole('dialog', { name: 'Er du sikker?' })
  const stored = () => {
    const result = loadTodos()
    if (result.status !== 'ok') throw new Error('Lagringen kunne ikke leses')
    return result.todos
  }

  it('«Slett» på kortet viser «Er du sikker?» med tittelen, uten visningen', () => {
    render(<App />)
    fireEvent.click(within(column()).getByRole('button', { name: 'Slett «Rense takrennene»' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(confirm()).toHaveAccessibleDescription('«Rense takrennene» slettes. Dette kan ikke angres.')
  })

  it('«Slett» i dialogen lukker visningen og viser bekreftelsen', () => {
    render(<App />)
    fireEvent.click(within(column()).getAllByRole('article')[0] ?? column())
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Rense takrennene' })).getByRole('button', { name: 'Slett' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(confirm()).toHaveAccessibleDescription('«Rense takrennene» slettes. Dette kan ikke angres.')
  })

  it('«Ja, slett» fjerner gjøremålet fra lagringen, hjulet og sidekolonnen', () => {
    render(<App />)
    expect(screen.getAllByTestId('prikk')).toHaveLength(3)
    fireEvent.click(within(column()).getByRole('button', { name: 'Slett «Rense takrennene»' }))
    fireEvent.click(within(confirm()).getByRole('button', { name: 'Ja, slett' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(stored()).toEqual([TODOS[1]])
    expect(screen.getAllByTestId('prikk')).toHaveLength(1)
    expect(within(column()).queryByRole('heading', { level: 3, name: 'Rense takrennene' })).toBeNull()
    expect(within(column()).getByRole('heading', { level: 3, name: 'Dekkskift' })).toBeInTheDocument()
  })

  it('sletter gjøremålet som ble valgt, også når det ikke står først i lagringen', () => {
    render(<App />)
    fireEvent.click(within(column()).getByRole('button', { name: 'Slett «Dekkskift»' }))
    expect(confirm()).toHaveAccessibleDescription('«Dekkskift» slettes. Dette kan ikke angres.')
    fireEvent.click(within(confirm()).getByRole('button', { name: 'Ja, slett' }))
    expect(stored()).toEqual([TODOS[0]])
    expect(screen.getAllByTestId('prikk')).toHaveLength(2)
    expect(within(column()).getByRole('heading', { level: 3, name: 'Rense takrennene' })).toBeInTheDocument()
  })

  it('lar ingen visning eller skjema for det slettede gjøremålet bli stående', () => {
    render(<App />)
    fireEvent.click(within(column()).getAllByRole('article')[0] ?? column())
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Rense takrennene' })).getByRole('button', { name: 'Slett' }))
    fireEvent.click(within(confirm()).getByRole('button', { name: 'Ja, slett' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    // A new todo afterwards gets an empty form, not the deleted one
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til nytt gjøremål' }))
    expect(within(screen.getByRole('dialog', { name: 'Nytt gjøremål' })).getByLabelText('Tittel')).toHaveValue('')
  })

  it('«Avbryt» lar gjøremålet være uendret', () => {
    render(<App />)
    const before = localStorage.getItem(STORAGE_KEY)
    fireEvent.click(within(column()).getByRole('button', { name: 'Slett «Dekkskift»' }))
    fireEvent.click(within(confirm()).getByRole('button', { name: 'Avbryt' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
    expect(screen.getAllByTestId('prikk')).toHaveLength(3)
    expect(within(column()).getAllByRole('article')).toHaveLength(2)
  })
})

describe('App, ødelagte data', () => {
  const RAW = '[{"id":'

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 12, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each([
    ['kan ikke leses', RAW],
    ['har ugyldig innhold', JSON.stringify([{ id: 'a1', tittel: 'Dekkskift' }])],
  ])('starter med tom liste og varsel når dataene %s', (_name, raw) => {
    localStorage.setItem(STORAGE_KEY, raw)
    render(<App />)
    expect(screen.queryAllByTestId('prikk')).toHaveLength(0)
    expect(within(screen.getByRole('complementary', { name: 'Denne måneden' })).queryAllByRole('article')).toHaveLength(0)
    expect(screen.getByRole('alert')).toHaveTextContent('Lagrede data var ødelagt.')
    expect(localStorage.getItem(CORRUPT_COPY_KEY)).toBe(raw)
  })

  it('viser ikke varselet når dataene er i orden eller mangler', () => {
    render(<App />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(localStorage.getItem(CORRUPT_COPY_KEY)).toBeNull()
  })

  it('beholder kopien når brukeren lagrer et nytt gjøremål', () => {
    localStorage.setItem(STORAGE_KEY, RAW)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til nytt gjøremål' }))
    fireEvent.change(screen.getByLabelText('Tittel'), { target: { value: 'Dekkskift' } })
    fireEvent.change(screen.getByLabelText('Dato 1'), { target: { value: '15.10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lagre' }))
    expect(loadTodos()).toMatchObject({ status: 'ok', todos: [{ title: 'Dekkskift' }] })
    expect(localStorage.getItem(CORRUPT_COPY_KEY)).toBe(RAW)
  })

  it('«Lukk» skjuler varselet', () => {
    localStorage.setItem(STORAGE_KEY, RAW)
    render(<App />)
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Lukk' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(localStorage.getItem(CORRUPT_COPY_KEY)).toBe(RAW)
  })

  it('sier at kopien er tatt vare på når den ble lagret', () => {
    localStorage.setItem(STORAGE_KEY, RAW)
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('En kopi av de ødelagte dataene er tatt vare på.')
  })

  it('sier fra og ber om nedlasting når kopien ikke kunne lagres', () => {
    localStorage.setItem(STORAGE_KEY, RAW)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('Kopien kunne ikke lagres i nettleseren. Last ned kopien før du lagrer noe nytt.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('tatt vare på')
    expect(screen.getByRole('button', { name: 'Last ned kopien' })).toBeInTheDocument()
  })

  it('viser varselet under toppfeltet, før hjulet og sidekolonnen', () => {
    localStorage.setItem(STORAGE_KEY, RAW)
    render(<App />)
    const header = screen.getByRole('banner')
    const alert = screen.getByRole('alert')
    const main = screen.getByRole('main')
    expect(header.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(alert.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(header.contains(alert) || main.contains(alert)).toBe(false)
  })
})

describe('App, lagring som feiler', () => {
  const TODOS = [
    { id: 'a1', title: 'Dekkskift', description: '', dates: [{ month: 10, day: 15 }], createdAt: '2026-02-03T10:00:00.000Z' },
  ]
  const STORED = JSON.stringify(TODOS)
  const SAVE_FAILED = 'Kunne ikke lagre. Lagringen i nettleseren er full eller blokkert.'
  const DELETE_FAILED = 'Kunne ikke slette. Lagringen i nettleseren er full eller blokkert.'

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, STORED)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 12, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const column = () => screen.getByRole('complementary', { name: 'Denne måneden' })
  const form = () => screen.getByRole('dialog', { name: 'Nytt gjøremål' })
  const confirm = () => screen.getByRole('dialog', { name: 'Er du sikker?' })
  const failWrites = () =>
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
  const addTodo = (title: string, date: string) => {
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til nytt gjøremål' }))
    fireEvent.change(screen.getByLabelText('Tittel'), { target: { value: title } })
    fireEvent.change(screen.getByLabelText('Dato 1'), { target: { value: date } })
    fireEvent.click(screen.getByRole('button', { name: 'Lagre' }))
  }

  it('starter med tom liste og et varsel når nettleseren sperrer lagringen', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Sperret', 'SecurityError')
    })
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('Nettleseren tillater ikke lagring.')
    expect(screen.queryAllByTestId('prikk')).toHaveLength(0)
    expect(within(column()).getByText('Ingen oppgaver denne måneden')).toBeInTheDocument()
  })

  it('varselet om sperret lagring kan lukkes', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Sperret', 'SecurityError')
    })
    render(<App />)
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Lukk' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('viser ingen varsel når lagringen virker', () => {
    render(<App />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lar skjemaet stå åpent med melding når et nytt gjøremål ikke kan lagres', () => {
    render(<App />)
    failWrites()
    addTodo('Rense takrennene', '03.10')
    expect(within(form()).getByRole('alert')).toHaveTextContent(SAVE_FAILED)
    expect(screen.getAllByTestId('prikk')).toHaveLength(1)
    expect(within(column()).queryByRole('heading', { level: 3, name: 'Rense takrennene' })).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(STORED)
  })

  it('lar redigeringen stå åpen med melding, og gjøremålet er uendret', () => {
    render(<App />)
    failWrites()
    fireEvent.click(within(column()).getByRole('button', { name: 'Rediger «Dekkskift»' }))
    fireEvent.change(screen.getByLabelText('Tittel'), { target: { value: 'Dekkskift til vinter' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lagre' }))
    const editForm = screen.getByRole('dialog', { name: 'Rediger gjøremål' })
    expect(within(editForm).getByRole('alert')).toHaveTextContent(SAVE_FAILED)
    expect(within(column()).getByRole('heading', { level: 3, name: 'Dekkskift' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(STORED)
  })

  it('starter uten melding når skjemaet åpnes på nytt', () => {
    render(<App />)
    failWrites()
    addTodo('Rense takrennene', '03.10')
    fireEvent.click(within(form()).getByRole('button', { name: 'Avbryt' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til nytt gjøremål' }))
    expect(within(form()).queryByRole('alert')).toBeNull()
  })

  it('lagrer og lukker skjemaet når lagringen virker igjen', () => {
    render(<App />)
    const spy = failWrites()
    addTodo('Rense takrennene', '03.10')
    spy.mockRestore()
    fireEvent.click(within(form()).getByRole('button', { name: 'Lagre' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(column()).getByRole('heading', { level: 3, name: 'Rense takrennene' })).toBeInTheDocument()
  })

  it('lar bekreftelsen stå med melding når slettingen ikke kan lagres, og gjøremålet blir', () => {
    render(<App />)
    failWrites()
    fireEvent.click(within(column()).getByRole('button', { name: 'Slett «Dekkskift»' }))
    fireEvent.click(within(confirm()).getByRole('button', { name: 'Ja, slett' }))
    expect(within(confirm()).getByRole('alert')).toHaveTextContent(DELETE_FAILED)
    expect(screen.getAllByTestId('prikk')).toHaveLength(1)
    expect(within(column()).getByRole('heading', { level: 3, name: 'Dekkskift' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(STORED)
  })

  it('starter uten melding når bekreftelsen åpnes på nytt', () => {
    render(<App />)
    failWrites()
    fireEvent.click(within(column()).getByRole('button', { name: 'Slett «Dekkskift»' }))
    fireEvent.click(within(confirm()).getByRole('button', { name: 'Ja, slett' }))
    fireEvent.click(within(confirm()).getByRole('button', { name: 'Avbryt' }))
    fireEvent.click(within(column()).getByRole('button', { name: 'Slett «Dekkskift»' }))
    expect(within(confirm()).queryByRole('alert')).toBeNull()
  })
})

describe('App, tomtilstand', () => {
  const EMPTY_TITLE = 'Ingen oppgaver denne måneden'

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 12, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const column = () => screen.getByRole('complementary', { name: 'Denne måneden' })
  const addTodo = (title: string, date: string) => {
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til nytt gjøremål' }))
    fireEvent.change(screen.getByLabelText('Tittel'), { target: { value: title } })
    fireEvent.change(screen.getByLabelText('Dato 1'), { target: { value: date } })
    fireEvent.click(screen.getByRole('button', { name: 'Lagre' }))
  }

  it('forsvinner når et gjøremål i måneden legges til, men ikke for en annen måned', () => {
    render(<App />)
    expect(within(column()).getByText(EMPTY_TITLE)).toBeInTheDocument()
    addTodo('Vårvask', '1.5')
    expect(within(column()).getByText(EMPTY_TITLE)).toBeInTheDocument()
    addTodo('Dekkskift', '15.10')
    expect(within(column()).queryByText(EMPTY_TITLE)).toBeNull()
  })

  it('kommer tilbake når det siste kortet i måneden slettes', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'a1', title: 'Dekkskift', description: '', dates: [{ month: 10, day: 15 }], createdAt: '2026-01-02T09:00:00.000Z' },
      ]),
    )
    render(<App />)
    expect(within(column()).queryByText(EMPTY_TITLE)).toBeNull()
    fireEvent.click(within(column()).getByRole('button', { name: 'Slett «Dekkskift»' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, slett' }))
    expect(within(column()).getByText(EMPTY_TITLE)).toBeInTheDocument()
  })
})

describe('App, fokus tilbake etter dialog', () => {
  const TODOS = [
    { id: 'a1', title: 'Dekkskift', description: '', dates: [{ month: 10, day: 15 }], createdAt: '2026-01-02T09:00:00.000Z' },
  ]

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(TODOS))
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 12, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const column = () => screen.getByRole('complementary', { name: 'Denne måneden' })
  const addButton = () => screen.getByRole('button', { name: '+ Legg til nytt gjøremål' })
  // Clicking does not move focus in jsdom, so the opener is focused first, as a click or Tab would do
  const open = (button: HTMLElement) => {
    button.focus()
    fireEvent.click(button)
  }

  it('går til «+ Legg til nytt gjøremål» når skjemaet lukkes', () => {
    render(<App />)
    open(addButton())
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(addButton()).toHaveFocus()
  })

  it('går til tittelen på kortet når visningen lukkes', () => {
    render(<App />)
    const title = within(column()).getByRole('button', { name: 'Dekkskift' })
    open(title)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Dekkskift' })).getByRole('button', { name: 'Lukk' }))
    expect(title).toHaveFocus()
  })

  it('går til prikken når visningen og så skjemaet lukkes', () => {
    render(<App />)
    const dot = screen.getByRole('button', { name: 'Dekkskift, 15. oktober' })
    open(dot)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Dekkskift' })).getByRole('button', { name: 'Rediger' }))
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(dot).toHaveFocus()
  })

  it('går til «Rediger» når redigeringen er lagret', () => {
    render(<App />)
    open(within(column()).getByRole('button', { name: 'Rediger «Dekkskift»' }))
    fireEvent.change(screen.getByLabelText('Tittel'), { target: { value: 'Dekkskift til vinter' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lagre' }))
    expect(within(column()).getByRole('button', { name: 'Rediger «Dekkskift til vinter»' })).toHaveFocus()
  })

  it('går til «Slett» når bekreftelsen avbrytes', () => {
    render(<App />)
    const remove = within(column()).getByRole('button', { name: 'Slett «Dekkskift»' })
    open(remove)
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(remove).toHaveFocus()
  })

  it('går til «+ Legg til nytt gjøremål» når kortet som åpnet dialogen er slettet', () => {
    render(<App />)
    open(within(column()).getByRole('button', { name: 'Slett «Dekkskift»' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, slett' }))
    expect(addButton()).toHaveFocus()
  })
})
