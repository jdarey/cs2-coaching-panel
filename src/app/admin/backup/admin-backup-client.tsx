'use client'

import { useState } from 'react'
import { Download, Upload, Loader2, AlertTriangle, CheckCircle2, AlertCircle, HardDrive, FileJson } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackupInfo {
  fileName: string
  size: number
  createdAt: string
  tables: number
  records: number
}

const MAX_RESTORE_BYTES = 50 * 1024 * 1024 // 50 MB — większe pliki ubiłyby pamięć funkcji

export function AdminBackupClient() {
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, setPending] = useState<{ name: string; size: number; users: number; exportedAt: string; body: any } | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const handleBackup = async () => {
    setMsg(null)
    try {
      const res = await fetch('/api/admin/backup')
      if (!res.ok) throw new Error('Błąd tworzenia backupu')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMsg({ ok: true, text: 'Backup pobrany pomyślnie.' })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd backupu' })
    }
  }

  // Krok 1: wybór pliku — walidacja po stronie klienta, BEZ wysyłki.
  // (Serwer przyjmuje JSON, nie multipart — wysyłka FormData kończyła się 500.)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMsg(null)
    setPending(null)
    setConfirmText('')
    if (!file.name.endsWith('.json')) {
      setMsg({ ok: false, text: 'Plik musi być w formacie .json' })
      return
    }
    if (file.size > MAX_RESTORE_BYTES) {
      setMsg({ ok: false, text: `Plik za duży (${(file.size / 1048576).toFixed(1)} MB, limit 50 MB)` })
      return
    }
    try {
      const body = JSON.parse(await file.text())
      if (!body || body.version == null || !Array.isArray(body.users)) {
        setMsg({ ok: false, text: 'To nie wygląda na backup z tej aplikacji (brak version/users)' })
        return
      }
      setPending({
        name: file.name,
        size: file.size,
        users: body.users.length,
        exportedAt: typeof body.exportedAt === 'string' ? body.exportedAt : '—',
        body,
      })
    } catch {
      setMsg({ ok: false, text: 'Nieprawidłowy JSON — plik jest uszkodzony' })
    }
  }

  // Krok 2: restore dopiero po wpisaniu PRZYWRÓĆ (nadpisuje całą bazę!).
  const handleRestore = async () => {
    if (!pending || confirmText.trim() !== 'PRZYWRÓĆ') return
    setRestoring(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending.body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Błąd przywracania')
      setPending(null)
      setConfirmText('')
      setMsg({ ok: true, text: 'Baza przywrócona pomyślnie. Odśwież stronę.' })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd przywracania' })
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]">
            <HardDrive className="w-5 h-5 text-white" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Administracja</p>
            <h1 className="font-display text-2xl font-bold">Backup / Restore</h1>
          </div>
        </div>
      </div>

      <p className="text-sm text-white/45 mb-6">
        Pełny backup bazy danych (JSON) – wszystkie tabele: użytkownicy, finanse, rangi, sesje, wideo, zadania, wiadomości, mecze, cele, logi audytu, feature flags i inne.
      </p>

      {msg && (
        <div className={cn('mb-6 rounded-xl px-4 py-3 text-sm border', msg.ok ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200' : 'bg-red-500/10 border-red-500/25 text-red-200')}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/15">
              <Download className="w-6 h-6 text-emerald-300" />
            </span>
            <div>
              <h3 className="font-display font-semibold text-white">Tworzenie backupu</h3>
              <p className="text-sm text-white/45">Pobierz pełny zrzut bazy danych jako plik JSON.</p>
            </div>
          </div>

          <button
            onClick={handleBackup}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25"
          >
            <Download className="w-4 h-4" /> Pobierz backup (JSON)
          </button>

          <p className="mt-3 text-xs text-white/35">
            Plik zawiera: użytkownicy, finanse, rangi, sesje, wideo, zadania, wiadomości, mecze, cele, logi audytu, feature flags i inne.
          </p>

          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="flex items-center gap-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Backup jest bezpieczny – zawiera tylko dane, nie hasła (te są hashowane).
            </p>
          </div>
        </div>

        {/* Restore */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-red-500/15">
              <Upload className="w-6 h-6 text-red-300" />
            </span>
            <div>
              <h3 className="font-display font-semibold text-white">Przywracanie z backupu</h3>
              <p className="text-sm text-white/45">Wgraj plik JSON z backupem, aby przywrócić bazę danych.</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Wybierz plik backupu (.json)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              disabled={restoring}
              className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 [color-scheme:dark] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-emerald-500/15 file:text-emerald-300 hover:file:bg-emerald-500/25"
            />
          </div>

          {pending && (
            <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
              <p className="text-sm text-amber-200 font-semibold">{pending.name}</p>
              <p className="mt-1 text-xs text-white/55">
                {(pending.size / 1024).toFixed(0)} KB · {pending.users} użytkowników · eksport: {pending.exportedAt}
              </p>
              <label className="mt-3 block text-xs font-semibold text-white/70">
                Wpisz <span className="text-amber-200 font-black">PRZYWRÓĆ</span>, aby nadpisać bazę:
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="PRZYWRÓĆ"
                disabled={restoring}
                className="mt-1.5 w-full h-10 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-amber-500/50 placeholder:text-white/25"
              />
              <button
                onClick={handleRestore}
                disabled={restoring || confirmText.trim() !== 'PRZYWRÓĆ'}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold text-white bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Nadpisz bazę z tego pliku
              </button>
            </div>
          )}

          {restoring && (
            <div className="flex items-center gap-3 text-amber-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              Przywracanie bazy danych… proszę czekać.
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="flex items-center gap-2 text-xs text-red-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-semibold">Uwaga:</span> Przywracanie nadpisze obecne dane w bazie. Zrób backup przed przywracaniem!
            </p>
            <p className="mt-2 text-xs text-red-300/80">Upewnij się, że plik JSON pochodzi z tego samego systemu (ta sama wersja schematu).</p>
          </div>
        </div>
      </div>
    </div>
  )
}