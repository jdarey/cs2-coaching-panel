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

export function AdminBackupClient() {
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

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

  const handleRestore = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setMsg({ ok: false, text: 'Plik musi być w formacie .json' })
      return
    }

    setRestoring(true)
    setMsg(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd przywracania')

      setMsg({ ok: true, text: 'Baza przywrócona pomyślnie. Odśwież stronę.' })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd przywracania' })
    } finally {
      setRestoring(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleRestore(file)
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
        Pełny backup bazy danych (JSON) – wszystkie tabele: użytkownicy, finanse, rangi, sesje, wideo, zadania, wiadomości, mecze, cele, finanse, logi audytu, feature flags i inne.
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
            Plik zawiera: użytkownicy, finanse, rangi, sesje, wideo, zadania, wiadomości, mecze, cele, finanse, logi audytu, feature flags i inne.
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
              onChange={(e) => handleRestore(e.target.files?.[0]!)}
              disabled={restoring}
              className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 [color-scheme:dark] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-emerald-500/15 file:text-emerald-300 hover:file:bg-emerald-500/25"
            />
          </div>

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