'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { cn, formatDate, spotlightHandler, getYouTubeId } from '@/lib/utils'
import { YoutubeCustomPlayer } from '@/components/youtube-custom-player'
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Calendar,
  Film,
  Moon,
  Globe,
  RotateCcw,
  Loader2,
  Sparkles,
  Target,
  Flame,
  Inbox,
  Check,
  ListChecks,
  ChevronDown,
  Clock,
  Trophy,
  Timer,
  MapPin,
  Repeat,
  CalendarDays,
  History,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { PracticeTimer } from '@/components/practice-timer'

interface Assignment {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  status: string
  completedAt: string | null
  createdAt: string
  video?: { id: string; title: string; url: string; thumbnail: string | null } | null
}

function mdToHtml(md: string): string {
  if (!md) return ''
  let html = md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#c4b5fd] underline hover:text-white">$1</a>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-white/90">$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-xs">$1</code>')
  const lines = html.split('\n')
  let out='', inList=false
  for (const line of lines) {
    if (/^\s*[-•]\s+/.test(line)) {
      if (!inList) { out += '<ul class="list-disc list-inside space-y-1 my-2 marker:text-[#a78bfa]">'; inList=true }
      out += `<li>${line.replace(/^\s*[-•]\s+/, '')}</li>`
    } else {
      if (inList) { out += '</ul>'; inList=false }
      if (line.trim()==='') out+=''
      else out += `<p class="my-1 leading-relaxed">${line}</p>`
    }
  }
  if (inList) out += '</ul>'
  return out
}
function toLocalDate(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

interface RoutineAssignment {
  id: string
  status: string
  completedAt: string | null
  endsAt: string | null
  routine: {
    id: string
    title: string
    description: string | null
    recurring: boolean
    tasks: { id: string; title: string; description: string | null; videoId: string | null; video?: { id: string; title: string; url: string; thumbnail: string | null } | null; steamMapUrl: string | null; gifUrl: string | null; linkUrl: string | null; day: number; minutes: number | null }[]
  }
  progress: { id: string; taskId: string; status: string; completedAt: string | null }[]
}

export function StudentTasksClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [routines, setRoutines] = useState<RoutineAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [togglingTask, setTogglingTask] = useState<string | null>(null)
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null)
  const [activeTimer, setActiveTimer] = useState<{ assignment: RoutineAssignment; task: RoutineAssignment['routine']['tasks'][number] } | null>(null)
  const [routineHistory, setRoutineHistory] = useState<Record<string, { calendar: any[]; summary: any }>>({})
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set())
  const [overallHistory, setOverallHistory] = useState<{ calendar: any[]; summary: any } | null>(null)
  const [loadingOverall, setLoadingOverall] = useState(true)
  const [selectedDay, setSelectedDay] = useState<{ date: string; entry: any } | null>(null)
  const [selectedTask, setSelectedTask] = useState<RoutineAssignment['routine']['tasks'][number] | null>(null)
  const [dayNotes, setDayNotes] = useState<Record<string,{content:string, sleep?:number|null}>>({})
  const [noteDraft, setNoteDraft] = useState("")
  const [sleepDraft, setSleepDraft] = useState<number | null>(null)
  const [savingNote, setSavingNote] = useState(false)
  const [repeatingId, setRepeatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [aRes, rRes, hRes, nRes] = await Promise.all([fetch('/api/assignments'), fetch('/api/routines'), fetch('/api/routines/history?months=3'), fetch('/api/calendar-notes')])
      if (aRes.ok) setAssignments(await aRes.json())
      if (rRes.ok) {
        const data = await rRes.json()
        setRoutines(data)
      }
      if (hRes.ok) setOverallHistory(await hRes.json())
      if (nRes.ok) {
        const notes: any[] = await nRes.json()
        const map: Record<string,{content:string, sleep?:number|null}> = {}
        notes.forEach((n:any)=> map[n.date]={content:n.content, sleep:n.sleep})
        setDayNotes(map)
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
      setLoadingOverall(false)
    }
  }, [])

  const loadOverallHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/routines/history?months=3')
      if (res.ok) setOverallHistory(await res.json())
    } catch { /* ignore */ }
  }, [])

  const loadHistory = useCallback(async (assignmentId: string) => {
    setLoadingHistory((prev) => new Set(prev).add(assignmentId))
    try {
      const res = await fetch(`/api/routines/history?assignmentId=${assignmentId}&months=12`)
      if (res.ok) {
        const data = await res.json()
        setRoutineHistory((prev) => ({ ...prev, [assignmentId]: data }))
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingHistory((prev) => {
        const next = new Set(prev)
        next.delete(assignmentId)
        return next
      })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // live tick for reset countdown
  const [tick, setTick] = useState(Date.now())
  useEffect(()=>{ const id=setInterval(()=>setTick(Date.now()),1000); return ()=>clearInterval(id)},[])
  useEffect(()=>{ if(selectedDay) { const n = dayNotes[selectedDay.date] as any; setNoteDraft(n?.content || ""); setSleepDraft(n?.sleep ?? null) } }, [selectedDay, dayNotes])

  // auto-refresh routines at midnight so recurring daily reset appears without manual reload
  useEffect(()=>{
    const d=new Date(tick)
    if(d.getHours()===0 && d.getMinutes()===0 && d.getSeconds()===0){
      load(); loadOverallHistory()
    }
  }, [tick])

  const saveDayNote = async () => {
    if (!selectedDay) return
    if (!noteDraft.trim() && sleepDraft===null) return
    setSavingNote(true)
    try {
      const payload: any = { date: selectedDay.date, content: noteDraft.trim() || "—" }
      if (sleepDraft !== null) payload.sleep = sleepDraft
      const res = await fetch('/api/calendar-notes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
      if (res.ok) {
        const n = await res.json()
        setDayNotes(prev=> ({...prev, [selectedDay.date]: {content: n.content, sleep: n.sleep}}))
        setSelectedDay({...selectedDay, entry: {...selectedDay.entry, note: n.content}})
      }
    } finally { setSavingNote(false) }
  }
  const deleteDayNote = async () => {
    if (!selectedDay) return
    await fetch(`/api/calendar-notes?date=${selectedDay.date}`, {method:'DELETE'})
    setDayNotes(prev=> { const c={...prev}; delete c[selectedDay.date]; return c })
    setNoteDraft(""); setSleepDraft(null)
  }

  const toggle = async (a: Assignment) => {
    setTogglingId(a.id)
    const next = a.status === 'DONE' ? 'PENDING' : 'DONE'
    try {
      const res = await fetch(`/api/assignments/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        setAssignments((prev) =>
          prev.map((x) =>
            x.id === a.id
              ? { ...x, status: next, completedAt: next === 'DONE' ? new Date().toISOString() : null }
              : x,
          ),
        )
      }
    } catch {
      /* ignore */
    } finally {
      setTogglingId(null)
    }
  }

  const toggleRoutineTask = async (ra: RoutineAssignment, taskId: string) => {
    setTogglingTask(taskId)
    const current = ra.progress.find((p) => p.taskId === taskId)
    const next = current?.status === 'DONE' ? 'PENDING' : 'DONE'
    try {
      const res = await fetch('/api/routines/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: ra.id, taskId, status: next }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => null)
        const doneBefore = ra.progress.filter((p:any)=>p.status==='DONE').length
        const willBeDone = next==='DONE' && (doneBefore + (current?.status==='DONE'?0:1) >= ra.routine.tasks.length)
        setRoutines((prev) =>
          prev.map((r) => {
            if (r.id !== ra.id) return r
            if (data?.repeated) {
              return { ...r, status: 'ACTIVE', progress: r.progress.map((p) => ({ ...p, status: 'PENDING', completedAt: null })) }
            }
            const progress = r.progress.some((p) => p.taskId === taskId)
              ? r.progress.map((p) =>
                  p.taskId === taskId
                    ? { ...p, status: next, completedAt: next === 'DONE' ? new Date().toISOString() : null }
                    : p,
                )
              : [...r.progress, { id: '', taskId, status: next, completedAt: next === 'DONE' ? new Date().toISOString() : null }]
            const allDone =
              progress.length >= r.routine.tasks.length && progress.every((p) => p.status === 'DONE')
            return { ...r, progress, status: allDone ? 'COMPLETED' : 'ACTIVE' }
          }),
        )
        // optimistic calendar update - od razu pokazuje że rutyna zrobiona dziś
        if (willBeDone) {
          const todayIso = toLocalDate(new Date())
          setOverallHistory(prev=>{
            if (!prev) return prev
            const map = new Map(prev.calendar.map((d:any)=>[d.date, {...d}]))
            const ex = map.get(todayIso) as any
            if (ex) {
              ex.times = (ex.times||0)+1
              ex.full = true
              ex.count = (ex.count||0) + ra.routine.tasks.length
              if (!ex.routines.includes(ra.routine.title)) ex.routines.push(ra.routine.title)
              ex.tasks = [...(ex.tasks||[]), { routineTitle: ra.routine.title, tasksDone: ra.routine.tasks.length, tasksTotal: ra.routine.tasks.length }]
            } else {
              map.set(todayIso, { date: todayIso, count: ra.routine.tasks.length, full: true, tasks: [{ routineTitle: ra.routine.title, tasksDone: ra.routine.tasks.length, tasksTotal: ra.routine.tasks.length }], minutes: ra.routine.tasks.reduce((a:any,t:any)=>a+(t.minutes||0),0), times:1, routines:[ra.routine.title] })
            }
            const cal = Array.from(map.values()).sort((a:any,b:any)=>a.date.localeCompare(b.date))
            return {...prev, calendar: cal, summary: {...prev.summary, totalDays: cal.length, totalSessions: cal.reduce((acc:any,d:any)=>acc+d.count,0), totalMinutes: cal.reduce((acc:any,d:any)=>acc+d.minutes,0)}}
          })
        }
        // refresh history after toggle - od razu zalicza dzień w kalendarzu (potwierdzenie z serwera)
        loadHistory(ra.id)
        loadOverallHistory()
      }
    } catch {
      /* ignore */
    } finally {
      setTogglingTask(null)
    }
  }

  const handleRepeat = async (assignmentId: string) => {
    setRepeatingId(assignmentId)
    try {
      const res = await fetch('/api/routines/repeat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ assignmentId })})
      if (res.ok) {
        const updated = await res.json()
        setRoutines(prev=> prev.map(r=> r.id===assignmentId ? updated : r))
        loadOverallHistory()
      }
    } finally { setRepeatingId(null) }
  }

  const now = new Date()
  const pendingCount = assignments.filter((a) => a.status === 'PENDING').length
  const doneCount = assignments.length - pendingCount

  const filtered = assignments.filter((a) => {
    if (filter === 'PENDING') return a.status === 'PENDING'
    if (filter === 'DONE') return a.status === 'DONE'
    return true
  })

  const isOverdue = (a: Assignment) =>
    a.status === 'PENDING' && a.dueDate && new Date(a.dueDate).getTime() < now.getTime()

  const sorted = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'PENDING' ? -1 : 1
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
    return ad - bd
  })

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 space-y-8">
        <PageHeader
          icon={ClipboardList}
          label="Plan treningowy"
          title="Zadania treningowe"
          subtitle="Zadania od Twojego trenera — wykonuj je, odhaczaj i buduj serię. To Twoja droga do mistrzostwa."
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '0ms' }} onMouseMove={spotlightHandler}>
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#fbbf24] to-[#f97316] ring-1 ring-white/20">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-white/45">Wszystkie zadania</p>
              </div>
            </div>
          </div>
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '80ms' }} onMouseMove={spotlightHandler}>
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] ring-1 ring-white/20">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-amber-300">{pendingCount}</p>
                <p className="text-xs text-white/45">Do zrobienia</p>
              </div>
            </div>
          </div>
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '160ms' }} onMouseMove={spotlightHandler}>
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#34d399] to-[#10b981] ring-1 ring-white/20">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-emerald-300">{doneCount}</p>
                <p className="text-xs text-white/45">Zrobione</p>
              </div>
            </div>
          </div>
        </section>

        {/* Top calendar - separate, readable */}
        <section className="glass-liquid rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20"><CalendarDays className="w-5 h-5 text-white"/></span>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Kalendarz treningów</h2>
              <p className="text-xs text-white/40">Ostatnie 14 dni • zielony = pełny, fioletowy = częściowy • kliknij dzień</p>
            </div>
            {overallHistory && <div className="ml-auto hidden sm:flex items-center gap-3 text-xs text-white/50"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/>Pełny</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#a78bfa]"/>Częściowy</span><span className="text-white/60 font-semibold">{overallHistory.summary.totalDays} dni • {overallHistory.summary.totalSessions} zadań</span></div>}
          </div>
          {loadingOverall ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#a78bfa] mr-2"/>Ładowanie…</div>
          ) : (
            <div>
              <div className="grid grid-cols-7 gap-2 text-xs text-white/45 text-center mb-2 font-semibold">
                {['Pon','Wt','Śr','Czw','Pt','Sob','Ndz'].map(d=> <span key={d} className="py-1.5">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-2.5">
                {(() => {
                  const map = new Map((overallHistory?.calendar || []).map((d:any)=> [d.date, d]))
                  const today = new Date(); today.setHours(12,0,0,0)
                  return Array.from({length:14}, (_,idx)=>{
                    const d = new Date(today); d.setDate(today.getDate() - (13-idx))
                    const iso = d.toISOString().split('T')[0]
                    const entry = map.get(iso) as any
                    const isFuture = d > today
                    const isToday = iso === new Date().toISOString().split('T')[0]
                    const isFull = entry?.full
                    const count = entry?.count || 0
                    return (
                      <button key={iso} disabled={isFuture} onClick={()=> setSelectedDay({date:iso, entry: entry || {count:0, full:false, tasks:[], minutes:0, date:iso}})} className={cn('relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 text-xs font-bold transition-all py-2', isFuture ? 'bg-transparent border-transparent cursor-default' : isToday ? 'ring-2 ring-[#a78bfa] border-[#a78bfa]/30' : 'border-transparent', isFull ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100 shadow-[0_2px_12px_-4px_rgba(16,185,129,0.3)] hover:bg-emerald-500/25' : count>0 ? 'bg-[#a78bfa]/20 border-[#a78bfa]/30 text-white shadow-[0_2px_12px_-4px_rgba(139,92,246,0.25)] hover:bg-[#a78bfa]/25' : !isFuture ? 'bg-white/[0.06] text-white/50 border-white/[0.08] hover:bg-white/[0.08] cursor-pointer' : '', !isFuture && 'cursor-pointer hover:scale-[1.04] hover:shadow-lg')} title={`${iso}: ${entry?.routines?.join(', ') ? entry.routines.join(', ') + ' ' : ''}${count ? count+' zadań'+(isFull?` ✓ Pełny${entry?.times>1 ? ` ${entry.times}×`:''} trening`: count>0?' • Za mało':'' ) : isFuture?'—':'brak • kliknij by dodać notatkę'}`}>
                        <span className={cn('text-[15px] leading-none', isToday ? 'font-black text-[#c4b5fd] text-base' : 'font-bold')}>{d.getDate()}</span>
                        <span className={cn('text-[10px] leading-none px-1.5 py-0.5 rounded-full font-bold', isFull ? 'bg-emerald-500/20 text-emerald-200' : count>0 ? 'bg-[#a78bfa]/20 text-white' : 'text-white/30')}>{entry?.times>1 ? `${entry.times}×` : isFull ? 'PEŁNY' : count>0 ? `${count}` : '—'}</span>
                        {dayNotes[iso]?.sleep ? <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#a78bfa] text-white text-[9px] font-bold grid place-items-center ring-1 ring-black/20" title={`Sen ${dayNotes[iso].sleep}/10`}>{dayNotes[iso].sleep}</span> : dayNotes[iso] && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-black/20" title="Notatka" />}
                      </button>
                    )
                  })
                })()}
              </div>
            </div>
          )}
        </section>

        {/* My routines - separate */}
        {!loading && routines.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20">
                <ListChecks className="w-4 h-4 text-white" />
              </span>
              <h2 className="font-display text-xl font-bold text-gradient-violet">Moje rutyny</h2>
              <span className="text-xs text-white/40 font-medium">Programy od trenera rozłożone na dni</span>
            </div>

            {routines.map((ra, i) => {
              const expanded = expandedRoutine === ra.id
              const doneCountR = ra.progress.filter((p) => p.status === 'DONE').length
              const totalCount = ra.routine.tasks.length
              const pct = totalCount > 0 ? Math.round((doneCountR / totalCount) * 100) : 0
              const completed = ra.status === 'COMPLETED'
              const days = Array.from(new Set(ra.routine.tasks.map((t) => t.day))).sort((a, b) => a - b)

              return (
                <div key={ra.id} className="glass-liquid rise-in spotlight-card rounded-3xl overflow-hidden transition-all duration-300" style={{ animationDelay: `${i * 70}ms` }} onMouseMove={spotlightHandler}>
                  <button onClick={() => setExpandedRoutine(expanded ? null : ra.id)} className="w-full flex items-center gap-4 p-5 text-left group">
                    <div className={cn('relative shrink-0 grid place-items-center w-11 h-11 rounded-2xl ring-1 transition-all duration-300', completed ? 'bg-gradient-to-br from-[#34d399] to-[#10b981] ring-white/25 shadow-[0_6px_20px_-6px_rgba(52,211,153,0.5)]' : 'bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-white/25 shadow-[0_6px_20px_-6px_rgba(139,92,246,0.5)]')}>
                      {completed ? <Trophy className="w-5 h-5 text-white" /> : <ListChecks className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn('font-display text-lg font-bold leading-snug', completed ? 'text-emerald-200' : 'text-white')}>{ra.routine.title}</h3>
                        {completed && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5"><Trophy className="w-3 h-3" /> Ukończona</span>}
                        {ra.routine.recurring && !completed && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#c4b5fd] bg-[#a78bfa]/10 border border-[#a78bfa]/25 rounded-full px-2 py-0.5"><Repeat className="w-3 h-3" /> Codziennie</span>}
                        {ra.endsAt && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/50 bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5"><Calendar className="w-3 h-3" /> do {formatDate(ra.endsAt)}</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 max-w-[220px] h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-700', completed ? 'bg-gradient-to-r from-[#34d399] to-[#10b981]' : 'bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6]')} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-white/60">{doneCountR}/{totalCount} zadań</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/40"><Calendar className="w-3 h-3" />{days.length} {days.length === 1 ? 'dzień' : 'dni'}</span>
                      </div>
                      {completed && ra.routine.recurring && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
                          <Clock className="w-3 h-3"/> Reset za {(() => { const ms = new Date(new Date(tick).setHours(24,0,0,0)).getTime() - tick; const h=Math.floor(ms/3600000); const m=Math.floor((ms%3600000)/60000); const s=Math.floor((ms%60000)/1000); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`})()} • jutro
                        </div>
                      )}
                    </div>
                    <ChevronDown className={cn('w-5 h-5 shrink-0 text-white/35 transition-transform duration-300', expanded && 'rotate-180')} />
                  </button>
                  {completed && (
                    <div className="px-5 pb-3 flex justify-center">
                      <button onClick={(e)=>{e.stopPropagation(); handleRepeat(ra.id)}} disabled={repeatingId===ra.id} className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:border-[#a78bfa]/30 hover:bg-white/[0.08] transition">
                        {repeatingId===ra.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <RotateCcw className="w-3.5 h-3.5"/>} Powtórz rutynę
                      </button>
                    </div>
                  )}

                  {expanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-white/[0.06]">
                      {ra.routine.description && (
                        <div className="my-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-sm text-white/60 leading-relaxed" dangerouslySetInnerHTML={{__html: mdToHtml(ra.routine.description)}} />
                      )}
                      {days.map((d) => {
                        const dayTasks = ra.routine.tasks.filter((t) => t.day === d)
                        const dayDone = dayTasks.filter((t) => ra.progress.find((p) => p.taskId === t.id)?.status === 'DONE').length
                        return (
                          <div key={d} className="py-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-[#c4b5fd]">Dzień {d}</p>
                              <span className="text-[11px] text-white/40">{dayDone}/{dayTasks.length} zrobione</span>
                            </div>
                            <div className="space-y-2">
                              {dayTasks.map((t) => {
                                const tp = ra.progress.find((p) => p.taskId === t.id)
                                const done = tp?.status === 'DONE'
                                return (
                                  <div key={t.id} onClick={()=> setSelectedTask(t)} className={cn('group flex items-start gap-3 rounded-2xl p-3.5 border transition-all duration-300 relative cursor-pointer', done ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.07] hover:border-[#a78bfa]/30 hover:bg-[#a78bfa]/[0.03]')}>
                                    <button onClick={(e)=>{e.stopPropagation(); toggleRoutineTask(ra, t.id)}} disabled={togglingTask === t.id} aria-label={done ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione'} className={cn('relative mt-0.5 shrink-0 grid place-items-center w-7 h-7 rounded-lg transition-all duration-300', done ? 'bg-gradient-to-br from-[#34d399] to-[#10b981] text-white ring-1 ring-white/25' : 'bg-white/[0.04] text-white/35 border border-white/[0.1] hover:border-[#a78bfa]/40 hover:text-[#c4b5fd]')}>
                                      {togglingTask === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Circle className="w-3.5 h-3.5" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p className={cn('text-sm font-semibold leading-snug flex items-center gap-2', done ? 'text-white/50 line-through decoration-white/30' : 'text-white/90')}>
                                        <span className="relative inline-flex items-center gap-1">
                                          {t.title}
                                          {t.gifUrl && (
                                        <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden sm:block opacity-0 group-hover:opacity-100 transition-all duration-300 scale-[0.96] group-hover:scale-100 z-30">
                                          <span className="flex flex-col rounded-3xl overflow-hidden bg-gradient-to-br from-[#0a0c0e]/95 via-[#141222]/95 to-[#1a1628]/95 backdrop-blur-xl border border-white/10 shadow-[0_24px_64px_-16px_rgba(139,92,246,0.35),0_8px_32px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)] w-64">
                                            <span className="relative h-36 w-64 bg-black block overflow-hidden">
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img src={t.gifUrl} alt={`Demo: ${t.title}`} className="w-full h-full object-cover" loading="lazy" />
                                              <span className="absolute inset-0 ring-1 ring-white/10 rounded-t-2xl pointer-events-none" />
                                            </span>

                                          </span>
                                          <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-[#1a1628] border-l border-b border-white/10 shadow-[-2px_2px_8px_rgba(0,0,0,0.3)]" />
                                        </span>
                                          )}
                                        </span>
                                      </p>
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        {t.minutes && <span className="inline-flex items-center gap-1 text-[11px] text-white/40"><Clock className="w-3 h-3" />~{t.minutes} min</span>}
                                        {t.video?.url && <span className="inline-flex items-center gap-1 text-[11px] text-[#c4b5fd]"><Film className="w-3 h-3"/>Film</span>}
                                        {t.steamMapUrl && <span onClick={e=>e.stopPropagation()}><a href={t.steamMapUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#fda4af] bg-[#f43f5e]/[0.08] border border-[#f43f5e]/25 hover:bg-[#f43f5e]/[0.16] hover:border-[#f43f5e]/40 transition-all"><MapPin className="w-3.5 h-3.5" />Mapa</a></span>}
                                        {t.minutes && !done && <button onClick={(e)=>{e.stopPropagation(); setActiveTimer({ assignment: ra, task: t })}} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#c4b5fd] bg-[#a78bfa]/[0.1] border border-[#a78bfa]/25 hover:bg-[#a78bfa]/[0.18] hover:border-[#a78bfa]/40 transition-all group/timer"><Timer className="w-3.5 h-3.5 transition-transform group-hover/timer:rotate-12" />Start</button>}
                                        {t.minutes && done && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/70"><Check className="w-3 h-3" />Odhaczone</span>}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )}

        {/* Dobra robota - wszystkie zadania zrobione */}
        {(() => {
          const todayIso = new Date().toISOString().split('T')[0]
          const todayFull = overallHistory?.calendar?.find((d:any)=> d.date===todayIso)?.full
          const allRoutinesDone = routines.length>0 && routines.every(ra=> ra.progress.filter((p:any)=>p.status==='DONE').length >= ra.routine.tasks.length && ra.routine.tasks.length>0)
          const showDone = !loading && !loadingOverall && (todayFull || allRoutinesDone)
          if (!showDone) return null
          return (
            <div className="glass-liquid rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden border border-emerald-500/20">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="mx-auto w-14 h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-[#34d399] to-[#10b981] ring-1 ring-white/20 shadow-[0_8px_24px_-8px_rgba(52,211,153,0.5)] mb-4">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white">Dobra robota na dziś! 🎉</h3>
                <p className="text-sm text-white/60 mt-2 max-w-xl mx-auto">Nie masz już nic więcej przewidziane. Wszystkie zadania z rutyn na dziś odhaczone — zasłużyłeś na przerwę.</p>
                <div className="mt-6">
                  <p className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3">Chcesz więcej? Proponowane ćwiczenia dodatkowe</p>
                  <div className="grid gap-3 sm:grid-cols-3 text-left">
                    {[
                      { title: 'Aim Botz — 15 min', desc: 'Skupienie na precyzji', icon: Target },
                      { title: 'Recoil Master — 10 min', desc: 'Kontrola sprayu', icon: Flame },
                      { title: 'Movement — 10 min', desc: 'Peeking & counter-strafe', icon: Timer },
                    ].map(c=> (
                      <div key={c.title} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 hover:border-[#a78bfa]/20 hover:bg-white/[0.06] transition">
                        <c.icon className="w-5 h-5 text-[#a78bfa] mb-2"/>
                        <p className="text-sm font-semibold text-white">{c.title}</p>
                        <p className="text-xs text-white/45 mt-1">{c.desc}</p>
                        <button onClick={() => { const r=routines[0]; if(r){ const t=r.routine.tasks[0]; if(t) setActiveTimer({assignment:r, task: { ...t, title: c.title, minutes: parseInt(c.title.match(/\d+/)?.[0]||'10') } as any}) } }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#c4b5fd] hover:text-white">Start <Timer className="w-3.5 h-3.5"/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'PENDING', 'DONE'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border', filter === f ? 'text-white border-[#a78bfa]/40 bg-[#a78bfa]/[0.08]' : 'text-white/50 border-white/[0.08] bg-white/[0.02] hover:text-white/80 hover:border-white/15')}>
              {f === 'ALL' && 'Wszystkie'}
              {f === 'PENDING' && 'Do zrobienia'}
              {f === 'DONE' && 'Zrobione'}
            </button>
          ))}
          {pendingCount > 0 && <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-white/40"><Flame className="w-3.5 h-3.5 text-[#a78bfa]" />{pendingCount} zadań czeka na Ciebie</span>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/40"><Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie zadań…</div>
        ) : sorted.length === 0 ? (
          <div className="glass-liquid rounded-3xl py-16 px-6 text-center flex flex-col items-center">
            <div className="relative w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa]/25 to-[#8b5cf6]/10 ring-1 ring-white/15 mb-4"><Inbox className="w-7 h-7 text-[#c4b5fd]" /></div>
            <p className="font-display text-base font-semibold text-white">{filter === 'ALL' ? 'Brak zadań od trenera' : filter === 'DONE' ? 'Brak ukończonych zadań' : 'Wszystko zrobione! 🎉'}</p>
            <p className="text-sm text-white/45 mt-1 max-w-md">{filter === 'ALL' ? 'Gdy trener przypisze Ci zadanie treningowe, pojawi się tutaj.' : filter === 'DONE' ? 'Ukończ pierwsze zadanie, aby zobaczyć je tutaj.' : 'Świetna robota — nie masz nic zaległego. Czekaj na nowe zadania od trenera!'}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map((a, i) => {
              const overdue = isOverdue(a)
              const done = a.status === 'DONE'
              return (
                <li key={a.id} className={cn('glass-liquid rise-in spotlight-card group relative rounded-3xl p-5 overflow-hidden transition-all duration-300', done && 'opacity-75')} style={{ animationDelay: `${i * 60}ms` }} onMouseMove={spotlightHandler}>
                  <div className="flex items-start gap-4">
                    <button onClick={() => toggle(a)} disabled={togglingId === a.id} aria-label={done ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione'} className={cn('relative mt-0.5 shrink-0 grid place-items-center w-8 h-8 rounded-xl transition-all duration-300', done ? 'bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white ring-1 ring-white/25 shadow-[0_6px_20px_-6px_rgba(45,229,202,0.6)]' : 'bg-white/[0.04] text-white/35 border border-white/[0.1] hover:border-[#a78bfa]/40 hover:text-[#c4b5fd]')}>
                      {togglingId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" strokeWidth={3} /> : <Circle className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn('font-display text-lg font-bold leading-snug transition-colors', done ? 'text-white/50 line-through decoration-white/30' : 'text-white')}>{a.title}</h3>
                        {overdue && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-300 bg-red-500/10 border border-red-500/25 rounded-full px-2 py-0.5">Po terminie</span>}
                        {done && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5"><Check className="w-3 h-3" /> Zrobione</span>}
                      </div>
                      {a.description && <p className={cn('mt-1.5 text-sm leading-relaxed', done ? 'text-white/35' : 'text-white/55')}>{a.description}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {a.video && <Link href={`/student/videos/${a.video.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c4b5fd] hover:text-white transition-colors bg-[#a78bfa]/[0.08] border border-[#a78bfa]/20 rounded-full px-3 py-1.5"><Film className="w-3.5 h-3.5" />{a.video.title}</Link>}
                        {a.dueDate && <span className={cn('inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border', overdue ? 'text-red-300 bg-red-500/8 border-red-500/20' : 'text-white/50 bg-white/[0.03] border-white/[0.08]')}><Calendar className="w-3.5 h-3.5" />Termin: {formatDate(a.dueDate)}</span>}
                        {a.completedAt && <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300/80 rounded-full px-3 py-1.5 bg-emerald-500/8 border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" />Ukończone {formatDate(a.completedAt)}</span>}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {activeTimer && (
          <PracticeTimer minutes={activeTimer.task.minutes ?? 10} taskTitle={activeTimer.task.title} onClose={() => setActiveTimer(null)} onComplete={(actualMinutes) => {
              fetch('/api/practice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: actualMinutes, taskId: activeTimer.task.id, assignmentId: activeTimer.assignment.id }) }).catch(() => undefined)
              toggleRoutineTask(activeTimer.assignment, activeTimer.task.id)
            }} />
        )}

        {selectedDay && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={()=>setSelectedDay(null)} />
            <div className="glass-liquid relative w-full max-w-sm rounded-3xl p-6 animate-rise-in">
              <button onClick={()=>setSelectedDay(null)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl text-white/50 hover:text-white hover:bg-white/5"><X className="w-4 h-4"/></button>
              <p className="text-[11px] uppercase tracking-widest text-[#c4b5fd] font-bold">{selectedDay.date}</p>
              <h3 className="font-display text-lg font-bold text-white mt-1">{selectedDay.entry.full ? '✓ Pełny trening' : selectedDay.entry.count>0 ? '• Za mało — niepełny' : 'Brak treningu'}</h3>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className={cn('px-3 py-1.5 rounded-full border font-semibold', selectedDay.entry.full ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : selectedDay.entry.count>0 ? 'bg-[#a78bfa]/10 border-[#a78bfa]/20 text-[#c4b5fd]' : 'bg-white/[0.03] border-white/[0.06] text-white/40')}>{selectedDay.entry.count} zadań</span>
                {selectedDay.entry.minutes ? <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/60 text-xs">{selectedDay.entry.minutes} min</span> : null}
                {selectedDay.entry.tasks?.length ? <span className="text-white/40 text-xs">{selectedDay.entry.tasks.length} szczegółów</span> : null}
              </div>
              {selectedDay.entry.tasks?.length > 0 && (
                <div className="mt-4 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {selectedDay.entry.tasks.map((t:any)=> <div key={t.taskId} className="flex items-center gap-2 text-sm bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0"/><span className="truncate text-white/80">{t.routineTitle ? `${t.routineTitle} — ${t.tasksDone}/${t.tasksTotal}` : t.title}</span><span className="ml-auto text-[11px] text-white/40">{t.routineTitle ? `${t.tasksDone}×` : `D${t.day}`}</span></div>)}
                </div>
              )}
              <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3"/>Notatka do dnia</p>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#a78bfa]/[0.07] to-[#6d28d9]/[0.04] border border-white/[0.06] mb-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-white/70 flex items-center gap-1.5"><span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] border border-white/[0.08]"><Moon className="w-3.5 h-3.5 text-[#a78bfa]"/></span> Sen</span>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-black border", sleepDraft ? "bg-[#a78bfa] text-white border-[#a78bfa] shadow" : "bg-white/[0.04] text-white/30 border-white/[0.06]")}>{sleepDraft ? `${sleepDraft}/10` : "— /10"}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({length:10},(_,i)=>i+1).map(v=> (
                      <button key={v} onClick={()=>setSleepDraft(v===sleepDraft ? null : v)} className={cn("h-9 rounded-xl text-sm font-bold border transition-all", sleepDraft===v ? "bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] text-white border-[#a78bfa] shadow-[0_4px_12px_-4px_rgba(139,92,246,0.4)] scale-[1.02]" : "bg-white/[0.04] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.12]")}>{v}</button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-white/25 mt-2 px-1 font-medium">
                    <span>😴 słabo</span>
                    <span>świetnie 😊</span>
                  </div>
                </div>
                <textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} placeholder="Dodaj notatkę do tego dnia (np. co poszło dobrze, co poprawić)..." rows={3} className="w-full rounded-xl bg-[#07060c] border border-white/[0.08] p-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#a78bfa]/30 resize-none" />
                <div className="flex gap-2 mt-3">
                  <button onClick={saveDayNote} disabled={savingNote || (!noteDraft.trim() && sleepDraft===null)} className="flex-1 h-9 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">{savingNote ? <Loader2 className="w-4 h-4 animate-spin"/> : null} Zapisz</button>
                  {dayNotes[selectedDay.date] && <button onClick={deleteDayNote} className="px-4 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/60 hover:text-red-300 hover:border-red-500/20">Usuń</button>}
                </div>
              </div>
              <button onClick={()=>setSelectedDay(null)} className="mt-3 w-full h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/80 hover:text-white text-sm font-semibold">Zamknij</button>
            </div>
          </div>
        )}

        {selectedTask && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={()=>setSelectedTask(null)} />
            <div className="glass-liquid relative w-full max-w-lg rounded-3xl overflow-hidden animate-rise-in max-h-[90vh] overflow-y-auto">
              {selectedTask.gifUrl && <div className="h-48 bg-black shrink-0"><img src={selectedTask.gifUrl} alt={selectedTask.title} className="w-full h-full object-cover" /></div>}
              <div className="p-6">
                <button onClick={()=>setSelectedTask(null)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl bg-black/40 text-white/70 hover:text-white"><X className="w-4 h-4"/></button>
                <h3 className="font-display text-xl font-bold text-white pr-8">{selectedTask.title}</h3>
                {selectedTask.description && <div className="text-sm text-white/70 mt-2 leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: mdToHtml(selectedTask.description)}} />}
                {selectedTask.video?.url && (
                  <div className="mt-4 rounded-2xl overflow-hidden bg-black border border-white/[0.08]">
                    {getYouTubeId(selectedTask.video.url) ? (
                      <div className="aspect-video">
                        <YoutubeCustomPlayer videoId={getYouTubeId(selectedTask.video.url)!} title={selectedTask.video.title} />
                      </div>
                    ) : (
                      <div className="aspect-video grid place-items-center bg-white/[0.03] p-6 text-center">
                        <Film className="w-8 h-8 text-white/30 mb-2"/>
                        <p className="text-sm text-white/60">{selectedTask.video.title}</p>
                        <a href={selectedTask.video.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-[#a78bfa]/20 text-[#c4b5fd]">Otwórz film</a>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedTask.minutes && <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/60"><Clock className="w-3.5 h-3.5"/>~{selectedTask.minutes} min</span>}
                  {selectedTask.video?.url && !getYouTubeId(selectedTask.video.url) && <a href={selectedTask.video.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#c4b5fd] hover:text-white"><Film className="w-3.5 h-3.5"/>{selectedTask.video.title}</a>}
                  {selectedTask.steamMapUrl && <a href={selectedTask.steamMapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#fda4af]"><MapPin className="w-3.5 h-3.5"/>Mapa Steam</a>}
                </div>
                <button onClick={()=>setSelectedTask(null)} className="mt-6 w-full h-11 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white font-semibold hover:bg-white/[0.1]">Zamknij</button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 flex items-center justify-center gap-2 text-[11px] text-white/25 font-medium tracking-wide">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/15" />
          <Sparkles className="w-3 h-3 text-[#a78bfa]/50" />
          <span className="uppercase tracking-[0.25em]">Małe kroki każdego dnia</span>
          <Sparkles className="w-3 h-3 text-[#a78bfa]/50" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/15" />
        </div>
      </div>
    </StudentLayout>
  )
}
