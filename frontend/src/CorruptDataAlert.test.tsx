import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import CorruptDataAlert from './CorruptDataAlert.tsx'

const RAW = '[{"id": "a1", "tittel": <script>alert(1)</script>'

describe('CorruptDataAlert', () => {
  let blobs: Blob[]
  let revoke: Mock<(url: string) => void>

  beforeEach(() => {
    blobs = []
    // jsdom has no object URLs; the stand-ins keep the blob so its content can be checked
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob)
      return 'blob:kopi'
    })
    revoke = vi.fn<(url: string) => void>()
    URL.revokeObjectURL = revoke
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const renderAlert = () => {
    const onClose = vi.fn()
    render(<CorruptDataAlert raw={RAW} isCopyKept onClose={onClose} />)
    return { onClose, alert: screen.getByRole('alert') }
  }

  it('sier at lagrede data var ødelagt', () => {
    const { alert } = renderAlert()
    expect(alert).toHaveTextContent(
      'Lagrede data var ødelagt. De kunne ikke leses, så årshjulet startet med en tom liste. En kopi av de ødelagte dataene er tatt vare på.',
    )
    expect(within(alert).getByText('Lagrede data var ødelagt.').tagName).toBe('STRONG')
  })

  it('viser aldri det ødelagte innholdet på siden', () => {
    const { alert } = renderAlert()
    expect(alert).not.toHaveTextContent('tittel')
    expect(document.querySelector('script')).toBeNull()
  })

  it('«Last ned kopien» laster ned det ødelagte innholdet som aarshjul-odelagte-data.json', async () => {
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this)
    })
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const { alert } = renderAlert()
    fireEvent.click(within(alert).getByRole('button', { name: 'Last ned kopien' }))

    expect(clicked).toHaveLength(1)
    expect(clicked[0]?.download).toBe('aarshjul-odelagte-data.json')
    expect(clicked[0]?.href).toBe('blob:kopi')
    expect(clicked[0]?.isConnected).toBe(false)
    expect(blobs).toHaveLength(1)
    expect(await blobs[0]?.text()).toBe(RAW)
    expect(blobs[0]?.type).toBe('application/json')
    // Released a little later, so the browser has started the download first
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(revoke).toHaveBeenCalledWith('blob:kopi')
  })

  it('«Lukk» ber om å skjule meldingen', () => {
    const { alert, onClose } = renderAlert()
    fireEvent.click(within(alert).getByRole('button', { name: 'Lukk' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('sier fra og ber om nedlasting når kopien ikke kunne lagres', () => {
    render(<CorruptDataAlert raw={RAW} isCopyKept={false} onClose={vi.fn()} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(
      'Lagrede data var ødelagt. De kunne ikke leses, så årshjulet startet med en tom liste. Kopien kunne ikke lagres i nettleseren. Last ned kopien før du lagrer noe nytt.',
    )
    expect(alert).not.toHaveTextContent('tatt vare på')
    expect(within(alert).getByRole('button', { name: 'Last ned kopien' })).toBeInTheDocument()
  })

  it('nevner ingen eldre kopi og har ingen knapp for den når det ikke finnes noen', () => {
    const { alert } = renderAlert()
    expect(alert).not.toHaveTextContent('eldre kopi')
    expect(within(alert).queryByRole('button', { name: 'Last ned eldre kopi' })).toBeNull()
  })

  it('sier at en eldre kopi også er tatt vare på, og «Last ned eldre kopi» laster den ned', async () => {
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this)
    })
    render(<CorruptDataAlert raw={RAW} isCopyKept olderRaw="[eldre]" onClose={vi.fn()} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('En kopi av de ødelagte dataene er tatt vare på. En eldre kopi er også tatt vare på.')

    fireEvent.click(within(alert).getByRole('button', { name: 'Last ned eldre kopi' }))
    expect(clicked[0]?.download).toBe('aarshjul-odelagte-data-eldre.json')
    expect(await blobs[0]?.text()).toBe('[eldre]')
  })

  it('nevner den eldre kopien også når den nye ikke kunne lagres', () => {
    render(<CorruptDataAlert raw={RAW} isCopyKept={false} olderRaw="[eldre]" onClose={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Kopien kunne ikke lagres i nettleseren. Last ned kopien før du lagrer noe nytt. En eldre kopi er også tatt vare på.',
    )
  })
})
