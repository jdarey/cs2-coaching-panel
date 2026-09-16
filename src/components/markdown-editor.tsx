'use client'

/**
 * Wygodny edytor markdown do opisów (rutyny, ćwiczenia):
 * - auto-wzrost wraz z treścią (bez sztywnych 3 linijek i scrolla),
 * - pasek narzędzi: B, I, nagłówki, listy, checklisty, cytat, link, separator,
 * - skróty: Ctrl/Cmd+B, Ctrl/Cmd+I, Ctrl/Cmd+K (link), Tab=2 spacje w listach,
 * - Enter kontynuuje listy (- • 1.), podgląd na żywo obok (desktop) lub pod,
 * - licznik znaków.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { mdToHtml } from '@/lib/format'
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, ListChecks,
  Quote, Link as LinkIcon, Minus, Eye, PenLine,
} from 'lucide-react'

export interface MarkdownEditorProps {
  value: string
  onChange: (v: string) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  minRows?: number
  maxRows?: number
  className?: string
}

/** Otoczenie zaznaczenia parami znaków (albo zaznacz słowo przed kursorem). */
function wrap(ta: HTMLTextAreaElement, before: string, after: string, placeholder: string, onChange: (v: string) => void) {
  const { selectionStart: s, selectionEnd: e, value } = ta
  const sel = value.slice(s, e)
  const text = sel || placeholder
  const nv = value.slice(0, s) + before + text + after + value.slice(e)
  onChange(nv)
  requestAnimationFrame(() => {
    ta.focus()
    if (sel) ta.setSelectionRange(s + before.length, s + before.length + text.length)
    else ta.setSelectionRange(s + before.length + text.length, s + before.length + text.length)
  })
}

/** Prefiks na początku każdej linii zaznaczenia (nagłówki, listy, cytat). */
function prefixLines(ta: HTMLTextAreaElement, prefix: string, onChange: (v: string) => void) {
  const { selectionStart: s, selectionEnd: e, value } = ta
  const start = value.lastIndexOf('\n', s - 1) + 1
  let end = value.indexOf('\n', e)
  if (end === -1) end = value.length
  const block = value.slice(start, end)
  // toggle: jeśli wszystkie linie już mają prefiks — zdejmij go
  const lines = block.split('\n')
  const allHave = lines.every((l) => l.startsWith(prefix) || l.trim() === '')
  const changed = lines
    .map((l) => {
      if (l.trim() === '' && lines.length > 1) return l
      if (allHave) return l.startsWith(prefix) ? l.slice(prefix.length) : l
      return prefix + l
    })
    .join('\n')
  const nv = value.slice(0, start) + changed + value.slice(end)
  onChange(nv)
  requestAnimationFrame(() => {
    ta.focus()
    ta.setSelectionRange(start, start + changed.length)
  })
}

function replaceSelection(ta: HTMLTextAreaElement, text: string, onChange: (v: string) => void, selStart?: number, selEnd?: number) {
  const { selectionStart: s, selectionEnd: e, value } = ta
  const nv = value.slice(0, s) + text + value.slice(e)
  onChange(nv)
  requestAnimationFrame(() => {
    ta.focus()
    const p = selStart ?? s + text.length
    ta.setSelectionRange(p, selEnd ?? p)
  })
}

export function MarkdownEditor({
  value,
  onChange,
  id,
  placeholder,
  disabled,
  maxLength = 2000,
  minRows = 5,
  maxRows = 24,
  className,
}: MarkdownEditorProps) {
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  const syncHeight = useCallback(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const lh = 20
    const min = minRows * lh + 20
    const max = maxRows * lh + 20
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, min), max)}px`
    ta.style.overflowY = ta.scrollHeight > max ? 'auto' : 'hidden'
  }, [minRows, maxRows])

  useEffect(() => { syncHeight() }, [value, syncHeight])

  const insertPrefix = (prefix: string) => taRef.current && prefixLines(taRef.current, prefix, onChange)

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); wrap(ta, '**', '**', 'pogrubienie', onChange); return }
    if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); wrap(ta, '*', '*', 'kursywa', onChange); return }
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); wrap(ta, '[', '](https://)', 'tekst', onChange); return }
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) { // shift+tab = usuń wcięcie
        const { selectionStart: s, selectionEnd: en, value: v } = ta
        const start = v.lastIndexOf('\n', s - 1) + 1
        if (v.slice(start, start + 2) === '  ') replaceSelection(ta, '', onChange, start, start + 2)
        return
      }
      replaceSelection(ta, '  ', onChange)
      return
    }
    // Enter kontynuuje listy: "- ", "• ", "1. ", "- [ ] "
    if (e.key === 'Enter' && !e.shiftKey) {
      const { selectionStart: s, value: v } = ta
      const lineStart = v.lastIndexOf('\n', s - 1) + 1
      const line = v.slice(lineStart, s)
      const m = line.match(/^(\s*)([-•]\s\[[ xX]\]\s|[-•]\s|(\d+)[.)]\s)(.*)$/)
      if (m) {
        e.preventDefault()
        if (m[4].trim() === '') { // pusty element listy kończy listę
          replaceSelection(ta, '\n', onChange)
          return
        }
        const num = m[3] ? `${parseInt(m[3], 10) + 1}. ` : m[2].replace(/\[[xX]\]/, '[ ]')
        replaceSelection(ta, `\n${m[1]}${num}`, onChange)
        return
      }
    }
  }

  const ToolBtn = ({ icon: Icon, label, onClick }: { icon: typeof Bold; label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.05] border border-white/[0.07] text-white/70 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.14] disabled:opacity-30 transition"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )

  return (
    <div className={cn('rounded-2xl border border-white/[0.08] bg-[#07060c]/60 overflow-hidden focus-within:border-[#a78bfa]/35 transition', className)}>
      {/* Toolbar + zakładka podglądu */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className={cn('flex items-center gap-1', tab === 'preview' && 'opacity-40 pointer-events-none')}>
          <ToolBtn icon={Bold} label="Pogrubienie (Ctrl+B)" onClick={() => taRef.current && wrap(taRef.current, '**', '**', 'pogrubienie', onChange)} />
          <ToolBtn icon={Italic} label="Kursywa (Ctrl+I)" onClick={() => taRef.current && wrap(taRef.current, '*', '*', 'kursywa', onChange)} />
          <span className="mx-1 h-5 w-px bg-white/[0.08]" />
          <ToolBtn icon={Heading1} label="Nagłówek 1" onClick={() => insertPrefix('# ')} />
          <ToolBtn icon={Heading2} label="Nagłówek 2" onClick={() => insertPrefix('## ')} />
          <ToolBtn icon={Heading3} label="Nagłówek 3" onClick={() => insertPrefix('### ')} />
          <span className="mx-1 h-5 w-px bg-white/[0.08]" />
          <ToolBtn icon={List} label="Lista punktowana" onClick={() => insertPrefix('- ')} />
          <ToolBtn icon={ListOrdered} label="Lista numerowana" onClick={() => insertPrefix('1. ')} />
          <ToolBtn icon={ListChecks} label="Checklista" onClick={() => insertPrefix('- [ ] ')} />
          <span className="mx-1 h-5 w-px bg-white/[0.08]" />
          <ToolBtn icon={Quote} label="Cytat" onClick={() => insertPrefix('> ')} />
          <ToolBtn icon={Minus} label="Separator" onClick={() => taRef.current && replaceSelection(taRef.current, '\n---\n', onChange)} />
          <ToolBtn icon={LinkIcon} label="Link (Ctrl+K)" onClick={() => taRef.current && wrap(taRef.current, '[', '](https://)', 'tekst', onChange)} />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab(tab === 'write' ? 'preview' : 'write')}
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-bold transition',
              tab === 'preview' ? 'bg-[#a78bfa]/15 border border-[#a78bfa]/25 text-[#e9d5ff]' : 'bg-white/[0.05] border border-white/[0.07] text-white/60 hover:text-white',
            )}
          >
            {tab === 'preview' ? <PenLine className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {tab === 'preview' ? 'Edytuj' : 'Podgląd'}
          </button>
        </div>
      </div>

      {/* Treść: edycja lub podgląd */}
      {tab === 'write' ? (
        <textarea
          ref={taRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          spellCheck
          className="block w-full resize-none bg-transparent p-3.5 text-sm leading-5 text-white placeholder:text-white/30 outline-none"
        />
      ) : (
        <div className="p-3.5 min-h-[80px]">
          {value.trim() ? (
            <div className="text-sm text-white/80 max-w-none" dangerouslySetInnerHTML={{ __html: mdToHtml(value) }} />
          ) : (
            <p className="text-sm text-white/30 italic">Nic tu jeszcze nie ma — przejdź do edycji i napisz coś.</p>
          )}
        </div>
      )}

      {/* Stopka: licznik + wskazówka */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-white/[0.06] bg-white/[0.015] text-[10px] font-medium">
        <span className="text-white/25">Enter — nowa linia · **pogrubienie** · [link](url) · - lista</span>
        <span className={cn('tabular-nums font-bold', value.length > maxLength * 0.92 ? 'text-amber-300/80' : 'text-white/25')}>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}
