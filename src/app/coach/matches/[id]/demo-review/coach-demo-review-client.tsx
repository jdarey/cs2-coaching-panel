'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { cn, formatDateTime } from '@/lib/utils'
import { CountUp } from '@/components/count-up'
import { EntranceGate } from '@/components/entrance-gate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft, ArrowRight, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  ChevronDown, ChevronUp, Download, Upload, FileText, Trash2, Edit, Save, Loader2,
  RotateCcw, Flag, MessageSquare, Zap, Target, Shield, Star, Settings,
} from 'lucide-react'

function pl(num: number): string {
  return num.toLocaleString('pl-PL')
}

interface DemoRound {
  round: number
  side: 'CT' | 'T'
  won: boolean
  timestamp: number
  notes: string
}

interface MatchData {
  id: string
  map: string
  result: string
  eloChange: number
  kills: number | null
  deaths: number | null
  reflection: string | null
  leetifyRating: number | null
  preaim: number | null
  reactionMs: number | null
  accuracyEnemySpotted: number | null
  accuracyHead: number | null
  sprayAccuracy: number | null
  createdAt: Date
  coachNotes: unknown
  coachVerdict: string | null
  coachReviewedAt: Date | null
  student: { id: string; name: string | null; email: string; avatarUrl: string | null }
}

const ROUND_WIN_THRESHOLD = 16

const MAP_ROUND_TIMES: Record<string, number[]> = {
  'Mirage': [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  'Inferno': [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  'Dust2': [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  'Nuke': [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  'Overpass': [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  'Vertigo': [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  'Ancient': [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  'Anubis': [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function CoachDemoReviewClient({ initialMatch }: { initialMatch: MatchData }) {
  const router = useRouter()
  const { toast } = useToast()
  const [match, setMatch] = useState<MatchData>(initialMatch)
  const [rounds, setRounds] = useState<DemoRound[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [showVerdictDialog, setShowVerdictDialog] = useState(false)
  const [verdict, setVerdict] = useState(match.coachVerdict || '')
  const [showPdfExport, setShowPdfExport] = useState(false)

  // Initialize rounds from coachNotes if available
  const initializeRounds = useCallback(() => {
    if (match.coachNotes && Array.isArray(match.coachNotes)) {
      const parsedRounds: DemoRound[] = match.coachNotes.map((note: any, i) => ({
        round: i + 1,
        side: note.side || (i < 15 ? 'CT' : 'T'),
        won: note.won ?? false,
        timestamp: note.timestamp || i * 120,
        notes: note.note || note.notes || '',
      }))
      setRounds(parsedRounds)
    } else {
      // Generate default 30 rounds
      const totalRounds = 30
      const newRounds: DemoRound[] = Array.from({ length: Math.max(totalRounds, 30) }, (_, i) => ({
        round: i + 1,
        side: i < 15 ? 'CT' : 'T',
        won: false,
        timestamp: i * 120,
        notes: '',
      }))
      setRounds(newRounds)
    }
  }, [match])

  const saveNotes = async () => {
    setIsSaving(true)
    try {
      const notesToSave = rounds.map((r, i) => ({
        round: r.round,
        side: r.side,
        won: r.won,
        timestamp: r.timestamp,
        note: r.notes,
      }))

      const res = await fetch(`/api/coach/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachNotes: notesToSave,
          coachVerdict: verdict,
          coachReviewedAt: new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      toast({ title: 'Zapisano', description: 'Notatki rund i werdykt zaktualizowane' })
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się zapisać', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRoundChange = (index: number, field: keyof DemoRound, value: any) => {
    setRounds(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const exportPdf = async () => {
    // Simple HTML to PDF using browser print
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const ctWins = rounds.filter(r => r.side === 'CT' && r.won).length
    const tWins = rounds.filter(r => r.side === 'T' && r.won).length

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Demo Review - ${match.map} - ${match.student.name || match.student.email}</title>
        <style>
          body { font-family: system-ui; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1a1a2e; border-bottom: 2px solid #a78bfa; padding-bottom: 10px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .stat { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #a78bfa; }
          .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .rounds { width: 100%; border-collapse: collapse; }
          .rounds th, .rounds td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          .rounds th { background: #f9fafb; font-weight: 600; }
          .won { color: #16a34a; font-weight: bold; }
          .lost { color: #dc2626; }
          .notes { max-width: 300px; white-space: pre-wrap; }
          .verdict { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 20px; white-space: pre-wrap; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Demo Review: ${match.map}</h1>
            <p>${match.student.name || match.student.email} • ${new Date(match.createdAt).toLocaleDateString('pl-PL')}</p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 24px; font-weight: bold; color: ${match.result === 'WIN' ? '#16a34a' : '#dc2626'};">
              ${match.result}
            </span>
            <p style="margin-top: 5px;">ELO: ${match.eloChange > 0 ? '+' : ''}${match.eloChange}</p>
          </div>
        </div>
        
        <div class="stats">
          <div class="stat"><div class="stat-value">${match.kills ?? '—'}</div><div class="stat-label">Kills</div></div>
          <div class="stat"><div class="stat-value">${match.deaths ?? '—'}</div><div class="stat-label">Deaths</div></div>
          <div class="stat"><div class="stat-value">${match.eloChange > 0 ? '+' : ''}${match.eloChange}</div><div class="stat-label">ELO Change</div></div>
        </div>

        <table class="rounds">
          <thead>
            <tr>
              <th>#</th><th>Side</th><th>Result</th><th>Time</th><th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rounds.map(r => `
              <tr>
                <td>${r.round}</td>
                <td>${r.side}</td>
                <td class="${r.won ? 'won' : 'lost'}">${r.won ? 'WON' : 'LOST'}</td>
                <td>${formatTime(r.timestamp)}</td>
                <td class="notes">${r.notes || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="verdict">
          <h3>Werdykt trenera</h3>
          <p>${verdict || 'Brak werdyktu'}</p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  const round = rounds[currentRound - 1]
  const totalRounds = rounds.length

  return (
    <CoachLayout>
      <EntranceGate className="max-w-7xl mx-auto px-4 sm:px-6 pb-24" delay={400}>
        <PageHeader
          icon={Flag}
          title="Demo Review"
          subtitle={`${match.map} • ${match.student.name || match.student.email} • ${new Date(match.createdAt).toLocaleDateString('pl-PL')}`}
        >
          <div className="flex items-center gap-2">
            <Link
              href="/coach/matches"
              className="group inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Wróć do meczów
            </Link>
            <Button onClick={saveNotes} disabled={isSaving} variant="secondary">
              <Save className="w-4 h-4 mr-2" /> Zapisz notatki
            </Button>
            <Button onClick={() => setShowVerdictDialog(true)} variant="outline">
              <MessageSquare className="w-4 h-4 mr-2" /> Werdykt
            </Button>
            <Button onClick={exportPdf} variant="ghost">
              <Download className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>
        </PageHeader>

        {/* Match Header */}
        <div className="mb-8">
          <div className="glass-liquid rise-in rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[#a78bfa]/10 blur-3xl animate-aurora pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/30">
                  <Flag className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">{match.map}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium', match.result === 'WIN' ? 'bg-emerald-500/20 text-emerald-300' : match.result === 'LOSS' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300')}>
                      {match.result}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.05] text-white/60">
                      <Zap className="w-3 h-3" />
                      {match.eloChange > 0 ? '+' : ''}{match.eloChange} ELO
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-wrap items-center justify-between gap-4 md:justify-end">
                <div className="grid grid-cols-4 gap-4 sm:grid-cols-4">
                  <div className="glass-liquid p-4 rounded-2xl text-center">
                    <p className="text-[11px] uppercase tracking-widest text-white/40">K / D</p>
                    <p className="font-display text-2xl font-bold text-white">{match.kills ?? '—'} / {match.deaths ?? '—'}</p>
                  </div>
                  <div className="glass-liquid p-4 rounded-2xl text-center">
                    <p className="text-[11px] uppercase tracking-widest text-white/40">Pre-aim</p>
                    <p className="font-display text-2xl font-bold text-[#34d399]">{match.preaim != null ? `${match.preaim}%` : '—'}</p>
                  </div>
                  <div className="glass-liquid p-4 rounded-2xl text-center">
                    <p className="text-[11px] uppercase tracking-widest text-white/40">Headshot %</p>
                    <p className="font-display text-2xl font-bold text-[#f87171]">{match.accuracyHead != null ? `${match.accuracyHead}%` : '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/coach/students/${match.student.id}`} className="group flex items-center gap-2 rounded-full px-4 py-2 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] transition-all">
                    <span className="hidden sm:inline">Profil ucznia</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link href={`/coach/matches/${match.id}`} className="group px-4 py-2 rounded-full bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] transition-all">
                    Szczegóły meczu
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Round Timeline */}
        <div className="mb-8">
          <div className="rise-in glass-liquid border-glow relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/25">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white/90">Timeline rund</h3>
                  <p className="text-xs text-white/40">Kliknij rundę, by dodać notatki. Zielony = wygrana, czerwony = przegrana.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="glass-liquid px-3 py-1.5 rounded-xl text-sm text-white/60">
                  Runda <span className="font-display font-bold text-white">{currentRound}</span> / {totalRounds}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentRound(Math.max(1, currentRound - 1))}
                    disabled={currentRound === 1}
                    className="p-2 rounded-xl bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentRound(Math.min(totalRounds, currentRound + 1))}
                    disabled={currentRound === totalRounds}
                    className="p-2 rounded-xl bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Round Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 gap-2 mb-6">
              {Array.from({ length: totalRounds }, (_, i) => {
                const r = rounds[i]
                const isCurrent = i + 1 === currentRound
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentRound(i + 1)}
                    className={cn(
                      'relative group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300',
                      r.won ? 'bg-emerald-500/[0.15] ring-1 ring-emerald-500/30' : 'bg-red-500/[0.15] ring-1 ring-red-500/30',
                      isCurrent && 'ring-2 ring-[#a78bfa] scale-105 z-10'
                    )}
                  >
                    <span className="font-display text-lg font-bold text-white/90 group-hover:text-white">{r.round}</span>
                    <span className="text-[10px] text-white/40">{r.side}</span>
                    <span className="text-[10px] font-bold">{r.won ? 'W' : 'L'}</span>
                    {r.notes && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#a78bfa] opacity-0 group-hover:opacity-100 transition-opacity" title={r.notes} />}
                  </button>
                )
              })}
            </div>

            {/* Current Round Detail */}
            {round && (
              <div className="glass-liquid rounded-2xl p-6 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('grid h-12 w-12 place-items-center rounded-xl ring-1', round.side === 'CT' ? 'bg-blue-500/[0.2] ring-blue-500/30' : 'bg-orange-500/[0.2] ring-orange-500/30')}>
                      <span className="font-display text-xl font-bold text-white">{round.side}</span>
                    </div>
                    <div>
                      <h4 className="font-display text-xl font-bold text-white">Runda {round.round}</h4>
                      <p className="text-sm text-white/50">{round.side} • {formatTime(round.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRoundChange(currentRound - 1, 'won', !round.won)}
                      className={cn(
                        'px-4 py-2 rounded-xl font-semibold text-sm transition-all',
                        round.won
                          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'
                      )}
                    >
                      {round.won ? 'WYGRANA' : 'PRZEGRANA'}
                    </button>
                    <Select value={round.side} onValueChange={v => handleRoundChange(currentRound - 1, 'side', v as 'CT' | 'T')}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Side" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CT">CT</SelectItem>
                        <SelectItem value="T">T</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mb-4">
                  <Label className="text-sm font-medium text-white/70 mb-1 block">Timestamp (sekundy)</Label>
                  <Input
                    type="number"
                    value={round.timestamp}
                    onChange={e => handleRoundChange(currentRound - 1, 'timestamp', parseInt(e.target.value) || 0)}
                    className="w-32"
                    min={0}
                    max={3600}
                  />
                  <span className="ml-3 text-sm text-white/50">{formatTime(round.timestamp)}</span>
                </div>

                <div>
                  <Label className="text-sm font-medium text-white/70 mb-1 block">Notatki do rundy</Label>
                  <Textarea
                    value={round.notes}
                    onChange={e => handleRoundChange(currentRound - 1, 'notes', e.target.value)}
                    placeholder="Co się stało? Pozycjonowanie, utility, duels, mistakes..."
                    rows={3}
                    className="bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#a78bfa]/40"
                  />
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => setCurrentRound(Math.max(1, currentRound - 1))}
                    disabled={currentRound === 1}
                    className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.10] hover:bg-white/[0.08] transition-all disabled:opacity-30"
                  >
                    <SkipBack className="w-4 h-4 mr-2" /> Poprzednia
                  </button>
                  <button
                    onClick={() => setCurrentRound(Math.min(totalRounds, currentRound + 1))}
                    disabled={currentRound === totalRounds}
                    className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.10] hover:bg-white/[0.08] transition-all disabled:opacity-30"
                  >
                    Następna <SkipForward className="w-4 h-4 ml-2" />
                  </button>
                  <Button onClick={saveNotes} disabled={isSaving} className="ml-auto">
                    <Save className="w-4 h-4 mr-2" /> Zapisz wszystko
                  </Button>
                </div>
              </div>
            )}

            {/* Mini map - quick jump */}
            <div className="mt-6 p-4 bg-white/[0.02] rounded-xl">
              <p className="text-[11px] text-white/40 mb-2">Szybki skok do rundy:</p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: totalRounds }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentRound(i + 1)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-[11px] font-medium transition-all',
                      i + 1 === currentRound
                        ? 'bg-[#a78bfa] text-white ring-2 ring-[#a78bfa]'
                        : rounds[i].won
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Verdict Dialog */}
        <Dialog open={showVerdictDialog} onOpenChange={setShowVerdictDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Werdykt trenera</DialogTitle>
            </DialogHeader>
            <Textarea
              value={verdict}
              onChange={e => setVerdict(e.target.value)}
              placeholder="Podsumuj mecz: co poszło dobrze, co nie, plan na przyszłość..."
              rows={8}
              className="w-full"
            />
            <DialogFooter>
              <Button onClick={() => setShowVerdictDialog(false)} variant="ghost">Anuluj</Button>
              <Button onClick={saveNotes} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" /> Zapisz werdykt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </EntranceGate>
    </CoachLayout>
  )
}