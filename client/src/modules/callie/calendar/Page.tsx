import { useEffect, useMemo, useState } from 'react'
import CallieFrame from '../shared/CallieFrame'
import { callieTheme, addedByChip } from '../shared/theme'
import {
  CallieEvent,
  CreateEventPayload,
  Recurrence,
  createEvent,
  deleteEvent,
  fetchEvents,
} from '../shared/api'
import { monthGrid, occurrencesByDay, toKey, RECURRENCE_LABELS, Occurrence } from './data'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const emptyForm = { title: '', date: '', time: '', recurrence: 'none' as Recurrence, until: '', notes: '' }

export default function OurCalendarPage() {
  const today = toKey(new Date())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [events, setEvents] = useState<CallieEvent[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Occurrence | null>(null)

  useEffect(() => {
    fetchEvents().then(setEvents).catch(() => {})
  }, [])

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])
  const byDay = useMemo(() => occurrencesByDay(events, grid.rangeStart, grid.rangeEnd), [events, grid])

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function openAdd(date?: string) {
    setForm({ ...emptyForm, date: date ?? today })
    setAdding(true)
  }

  async function submit() {
    if (!form.title.trim() || !form.date || saving) return
    setSaving(true)
    try {
      const payload: CreateEventPayload = {
        title: form.title.trim(),
        date: form.date,
        recurrence: form.recurrence,
      }
      if (form.time) payload.time = form.time
      if (form.until && form.recurrence !== 'none') payload.until = form.until
      if (form.notes.trim()) payload.notes = form.notes.trim()
      const created = await createEvent(payload)
      setEvents((prev) => [...prev, created])
      setAdding(false)
    } catch {
      // keep the modal open so nothing typed is lost
    } finally {
      setSaving(false)
    }
  }

  async function removeSelected() {
    if (!selected) return
    try {
      await deleteEvent(selected.event.id)
      setEvents((prev) => prev.filter((e) => e.id !== selected.event.id))
      setSelected(null)
    } catch {
      // keep the popover if the delete failed
    }
  }

  const inputStyle = {
    border: '1px solid #fbcfe3',
    background: '#fffafc',
    color: '#831843',
  } as const

  return (
    <CallieFrame
      title="Our Calendar 💚"
      action={
        <button
          type="button"
          onClick={() => openAdd()}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-105"
          style={{ background: callieTheme.pink }}
        >
          + Add event
        </button>
      }
    >
      <div className="rounded-2xl p-3 sm:p-5" style={callieTheme.card}>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="rounded-full w-9 h-9 text-lg font-bold"
            style={{ background: '#fce7f3', color: callieTheme.pinkText }}
          >
            ‹
          </button>
          <h2 className="text-lg font-bold" style={{ color: callieTheme.pinkText }}>
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="rounded-full w-9 h-9 text-lg font-bold"
            style={{ background: '#fce7f3', color: callieTheme.pinkText }}
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[11px] font-semibold py-1" style={{ color: callieTheme.muted }}>
              {day}
            </div>
          ))}
          {grid.days.map((key) => {
            const inMonth = Number(key.slice(5, 7)) - 1 === cursor.month
            const isToday = key === today
            const occurrences = byDay.get(key) ?? []
            return (
              <div
                key={key}
                onClick={() => openAdd(key)}
                className="min-h-[64px] sm:min-h-[84px] rounded-xl p-1 sm:p-1.5 cursor-pointer transition-colors"
                style={{
                  background: inMonth ? '#fffafc' : 'rgba(255,250,252,0.45)',
                  border: isToday ? `2px solid ${callieTheme.green}` : '1px solid #fce7f3',
                }}
              >
                <span
                  className="text-[11px] sm:text-xs font-semibold"
                  style={{ color: isToday ? callieTheme.greenText : inMonth ? callieTheme.pinkText : '#e3b7cd' }}
                >
                  {Number(key.slice(8))}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {occurrences.slice(0, 3).map((occ) => {
                    const mine = occ.event.added_by === 'callie'
                    return (
                      <button
                        key={`${occ.event.id}-${occ.date}`}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelected(occ) }}
                        className="block w-full truncate text-left text-[10px] sm:text-[11px] rounded-md px-1 sm:px-1.5 py-0.5 font-medium"
                        style={mine ? callieTheme.pinkChip : callieTheme.greenChip}
                        title={occ.event.title}
                      >
                        {occ.event.time ? `${occ.event.time} ` : ''}{occ.event.title}
                      </button>
                    )
                  })}
                  {occurrences.length > 3 && (
                    <span className="block text-[10px] px-1" style={{ color: callieTheme.muted }}>
                      +{occurrences.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-[11px] flex items-center gap-3" style={{ color: callieTheme.muted }}>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#f9a8d0' }} /> added by Callie
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#8ce99a' }} /> added by Sam
          </span>
        </p>
      </div>

      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(131,24,67,0.35)' }}
          onClick={() => !saving && setAdding(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 sm:p-6"
            style={callieTheme.card}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: callieTheme.pink }}>
              New event 🎀
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What are we doing?"
                maxLength={120}
                className="w-full rounded-xl px-3.5 py-2 text-sm outline-none"
                style={inputStyle}
              />
              <div className="flex gap-2">
                <label className="flex-1 text-xs font-medium" style={{ color: callieTheme.muted }}>
                  Date
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </label>
                <label className="flex-1 text-xs font-medium" style={{ color: callieTheme.muted }}>
                  Time (optional)
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <label className="flex-1 text-xs font-medium" style={{ color: callieTheme.muted }}>
                  Repeats
                  <select
                    value={form.recurrence}
                    onChange={(e) => setForm({ ...form, recurrence: e.target.value as Recurrence })}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  >
                    {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                {form.recurrence !== 'none' && (
                  <label className="flex-1 text-xs font-medium" style={{ color: callieTheme.muted }}>
                    Until (optional)
                    <input
                      type="date"
                      value={form.until}
                      onChange={(e) => setForm({ ...form, until: e.target.value })}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none"
                      style={inputStyle}
                    />
                  </label>
                )}
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes (optional)"
                rows={2}
                maxLength={500}
                className="w-full rounded-xl px-3.5 py-2 text-sm outline-none resize-none"
                style={inputStyle}
              />
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setAdding(false)}
                disabled={saving}
                className="rounded-full px-4 py-2 text-sm"
                style={{ color: callieTheme.muted }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving || !form.title.trim() || !form.date}
                className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: callieTheme.green }}
              >
                {saving ? '…' : 'Save 💚'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(131,24,67,0.35)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5"
            style={callieTheme.card}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold" style={{ color: callieTheme.pink }}>
                {selected.event.title}
              </h3>
              <span
                className="text-[11px] rounded-full px-2 py-0.5 font-medium shrink-0"
                style={addedByChip(selected.event.added_by).style}
              >
                {addedByChip(selected.event.added_by).label}
              </span>
            </div>
            <p className="mt-2 text-sm" style={{ color: '#9d5c81' }}>
              {new Date(`${selected.date}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              {selected.event.time ? ` · ${selected.event.time}` : ''}
            </p>
            <p className="text-sm" style={{ color: '#9d5c81' }}>
              {RECURRENCE_LABELS[selected.event.recurrence]}
              {selected.event.until ? ` until ${selected.event.until}` : ''}
            </p>
            {selected.event.notes && (
              <p className="mt-2 text-sm break-words" style={{ color: '#9d5c81' }}>
                {selected.event.notes}
              </p>
            )}
            <div className="mt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={removeSelected}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{ background: '#ffe3e3', color: '#c92a2a' }}
              >
                Delete{selected.event.recurrence !== 'none' ? ' series' : ''}
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full px-4 py-2 text-sm"
                style={{ color: callieTheme.muted }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </CallieFrame>
  )
}
