'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { cn, formatDate, spotlightHandler, getYouTubeId } from '@/lib/utils'
import dynamic from 'next/dynamic'
const YoutubeCustomPlayer = dynamic(() => import('@/components/youtube-custom-player').then(m => m.YoutubeCustomPlayer), { ssr: false, loading: () => <div className="yt-force-dark w-full h-full grid place-items-center bg-black/40 text-white/30 text-sm">Ładowanie odtwarzacza…</div> })
import { useSession } from 'next-auth/react'
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
  Layers,
  Zap,
  ArrowRight,
  Play,
  Star,
  Wand2,
  Crosshair,
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
function toLocalDate(d: Date): string { return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' }) }

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
  const { data: session } = useSession()
  const watermark = (session?.user as any)?.email || 'student'
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
  const [selectedAssignment, setSelectedAssignment] = useState<RoutineAssignment | null>(null)
  const [dayNotes, setDayNotes] = useState<Record<string,{content:string, sleep?:number|null}>>({})
  const [noteDraft, setNoteDraft] = useState("")
  const [sleepDraft, setSleepDraft] = useState<number | null>(null)
  const [savingNote, setSavingNote] = useState(false)
  const [repeatingId, setRepeatingId] = useState<string | null>(null)
  const [gifPreview, setGifPreview] = useState<{ src: string; title: string } | null>(null)
  const [gifClosing, setGifClosing] = useState(false)
  const gifPreviewRef = useRef<HTMLDivElement | null>(null)
  const gifTarget = useRef({ x: 0, y: 0 })
  const gifCur = useRef({ x: 0, y: 0 })
  const gifRaf = useRef<number | null>(null)
  const gifOpen = useRef(false)
  const gifCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canHover = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

  // Butter-smooth follower: goni kursor z lerpem + delikatny tilt od prędkości
  const gifLoop = () => {
    const el = gifPreviewRef.current
    if (!el || !gifOpen.current) { gifRaf.current = null; return }
    const c = gifCur.current, t = gifTarget.current
    const nx = c.x + (t.x - c.x) * 0.14
    const ny = c.y + (t.y - c.y) * 0.14
    const vx = nx - c.x
    gifCur.current = { x: nx, y: ny }
    const W = 344, H = 320, GAP = 26
    let x = nx + GAP, y = ny - H / 2
    if (x + W > window.innerWidth - 12) x = nx - W - GAP
    if (y + H > window.innerHeight - 12) y = window.innerHeight - H - 12
    if (x < 12) x = 12
    if (y < 12) y = 12
    const rot = Math.max(-5, Math.min(5, vx * 0.9))
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`
    gifRaf.current = requestAnimationFrame(gifLoop)
  }
  const startGifLoop = () => {
    if (gifRaf.current === null) gifRaf.current = requestAnimationFrame(gifLoop)
  }
  const openGifPreview = (src: string, title: string, cx: number, cy: number) => {
    if (gifCloseTimer.current) { clearTimeout(gifCloseTimer.current); gifCloseTimer.current = null }
    const fresh = !gifOpen.current
    gifTarget.current = { x: cx, y: cy }
    if (fresh) gifCur.current = { x: cx, y: cy }
    gifOpen.current = true
    setGifClosing(false)
    setGifPreview({ src, title })
  }
  const closeGifPreview = () => {
    if (gifCloseTimer.current) clearTimeout(gifCloseTimer.current)
    if (!gifOpen.current) return
    // Freeze pozycji + szybkie czyste wyjście (150ms), bez mrugania przy
    // przechodzeniu między wierszami (open anuluje timer i cofa exit).
    gifOpen.current = false
    if (gifRaf.current) { cancelAnimationFrame(gifRaf.current); gifRaf.current = null }
    setGifClosing(true)
    gifCloseTimer.current = setTimeout(() => {
      setGifPreview(null)
      setGifClosing(false)
    }, 150)
  }
  const killGifPreview = () => {
    if (gifCloseTimer.current) { clearTimeout(gifCloseTimer.current); gifCloseTimer.current = null }
    gifOpen.current = false
    if (gifRaf.current) { cancelAnimationFrame(gifRaf.current); gifRaf.current = null }
    setGifClosing(false)
    setGifPreview(null)
  }

  useEffect(() => {
    if (gifPreview) startGifLoop()
  }, [gifPreview])

  useEffect(() => () => {
    if (gifRaf.current) cancelAnimationFrame(gifRaf.current)
    if (gifCloseTimer.current) clearTimeout(gifCloseTimer.current)
  }, [])

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
      const res = await fetch(`/api/routines/history?months=3&_=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setOverallHistory(prev=>{
          if (!prev) return data
          const todayIso = toLocalDate(new Date())
          const f = (data.calendar as any[]).find((d:any)=>d.date===todayIso) as any
          const p = (prev.calendar as any[]).find((d:any)=>d.date===todayIso) as any
          if (p && f && f.count < p.count) return prev
          if (p && !f && p.count>0) return prev
          return data
        })
      }
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

  // tick dla licznika resetu — 30s wystarczy (minuty, nie sekundy).
  // Wcześniej cała strona przerysowywała się co sekundę (bateria w telefonie).
  const [tick, setTick] = useState(Date.now())
  useEffect(()=>{ const id=setInterval(()=>{ if (document.visibilityState === 'visible') setTick(Date.now()) },30000); return ()=>clearInterval(id)},[])
  useEffect(()=>{ if(selectedDay) { const n = dayNotes[selectedDay.date] as any; setNoteDraft(n?.content || ""); setSleepDraft(n?.sleep ?? null) } }, [selectedDay, dayNotes])

  // auto-refresh routines at midnight so recurring daily reset appears without manual reload
  // (guard na wypadek kilku ticków w tej samej minucie)
  const lastMidnightLoad = useRef<string | null>(null)
  useEffect(()=>{
    const d=new Date(tick)
    if(d.getHours()===0 && d.getMinutes()===0){
      const key=d.toDateString()
      if(lastMidnightLoad.current!==key){
        lastMidnightLoad.current=key
        load(); loadOverallHistory()
      }
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
            const base = prev || { calendar: [], summary: { totalDays: 0, totalSessions: 0, totalMinutes: 0, months: 3 } } as any
            const map = new Map(base.calendar.map((d:any)=>[d.date, {...d}]))
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
            return {...base, calendar: cal, summary: {...base.summary, totalDays: cal.length, totalSessions: cal.reduce((acc:any,d:any)=>acc+d.count,0), totalMinutes: cal.reduce((acc:any,d:any)=>acc+d.minutes,0)}}
          })
        } else if (next === 'DONE') {
          const todayIso = toLocalDate(new Date())
          setOverallHistory(prev=>{
            const base2 = prev || { calendar: [], summary: { totalDays: 0, totalSessions: 0, totalMinutes: 0, months: 3 } } as any
            const map = new Map(base2.calendar.map((d:any)=>[d.date, {...d, tasks:[...(d.tasks||[])], routines:[...(d.routines||[])]}]))
            const ex = map.get(todayIso) as any
            const info = { taskId, title: ra.routine.tasks.find((t:any)=>t.id===taskId)?.title || 'Zadanie', day: 1, minutes: ra.routine.tasks.find((t:any)=>t.id===taskId)?.minutes || null, routineTitle: ra.routine.title }
            if (ex) {
              if (ex.full) return prev
              ex.count = (ex.count||0)+1
              ex.tasks = [...(ex.tasks||[]), info]
              ex.minutes = (ex.minutes||0) + (info.minutes||0)
              if (!ex.routines.includes(ra.routine.title)) ex.routines.push(ra.routine.title)
            } else {
              map.set(todayIso, { date: todayIso, count: 1, full: false, tasks: [info], minutes: info.minutes||0, times: 0, routines: [ra.routine.title] })
            }
            const cal = Array.from(map.values()).sort((a:any,b:any)=>a.date.localeCompare(b.date))
            return {...base2, calendar: cal, summary: {...base2.summary, totalDays: cal.length, totalSessions: cal.reduce((acc:any,d:any)=>acc+d.count,0), totalMinutes: cal.reduce((acc:any,d:any)=>acc+d.minutes,0)}}
          })
        } else if (next === 'PENDING') {
          const todayIso = toLocalDate(new Date())
          setOverallHistory(prev=>{
            if (!prev) return prev
            const map = new Map(prev.calendar.map((d:any)=>[d.date, {...d, tasks:[...(d.tasks||[])], routines:[...(d.routines||[])]}]))
            const ex = map.get(todayIso) as any
            if (!ex) return prev
            ex.count = Math.max(0, (ex.count||1)-1)
            ex.tasks = (ex.tasks||[]).filter((t:any)=> t.taskId !== taskId)
            if (ex.count<=0) map.delete(todayIso)
            else { ex.full = false; ex.times = 0 }
            const cal = Array.from(map.values()).sort((a:any,b:any)=>a.date.localeCompare(b.date))
            return {...prev, calendar: cal, summary: {...prev.summary, totalDays: cal.length, totalSessions: cal.reduce((acc:any,d:any)=>acc+d.count,0), totalMinutes: cal.reduce((acc:any,d:any)=>acc+d.minutes,0)}}
          })
        }
        // refresh with delay to avoid overwriting optimistic (DB commit)
        setTimeout(()=>{ loadHistory(ra.id); loadOverallHistory(); }, 400)
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

  const calendarDays = useMemo(() => {
    const map = new Map((overallHistory?.calendar || []).map((d: any) => [d.date, d]))
    const today = new Date(); today.setHours(12, 0, 0, 0)
    const start = new Date(today); start.setDate(today.getDate() - 13)
    const todayIso = toLocalDate(new Date())
    return Array.from({ length: 14 }, (_, idx) => {
      const d = new Date(start); d.setDate(start.getDate() + idx)
      const iso = toLocalDate(d)
      const entry = map.get(iso) as any
      return {
        iso,
        d,
        entry,
        isFuture: d > today,
        isToday: iso === todayIso,
        isFull: !!entry?.full,
        count: entry?.count || 0,
        times: entry?.times || 0,
        hasNote: !!dayNotes[iso],
      }
    })
  }, [overallHistory, dayNotes])

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

        {/* Top calendar - fresh, 14 dni */}
        <section className="glass-liquid rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/10"><CalendarDays className="w-5 h-5 text-white"/></span>
            <div>
              <h2 className="font-display text-xl font-bold text-white">Kalendarz</h2>
              <p className="text-xs text-white/40">Ostatnie 14 dni • zielony pełny • fioletowy częściowy • kliknij dzień</p>
            </div>
            {overallHistory && <span className="ml-auto hidden sm:inline-flex items-center gap-2 text-xs text-white/50"><span className="w-2 h-2 rounded-full bg-emerald-500"/>Pełny<span className="w-2 h-2 rounded-full bg-[#a78bfa] ml-2"/>Częściowy<span className="w-2 h-2 rounded-full bg-red-500 ml-2"/>Brak<span className="ml-2 font-semibold text-white/70">{overallHistory.summary.totalDays} dni</span></span>}
          </div>
          <div className="flex justify-end mb-3">
            <button onClick={async ()=>{ if(!confirm('Zresetować wszystkie dni i zacząć od nowa? To usunie historię kalendarza.')) return; await fetch('/api/calendar/reset', {method:'POST'}); await fetch('/api/routines/reset-all', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({})}); load(); loadOverallHistory(); }} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-red-300 hover:border-red-500/20 hover:bg-red-500/10">
              <RotateCcw className="w-3 h-3"/> Resetuj wszystkie dni
            </button>
          </div>
          {loadingOverall ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#a78bfa] mr-2"/>Ładowanie…</div>
          ) : (
            <div>
              <div className="grid grid-cols-7 gap-2 text-[11px] text-white/30 text-center mb-2 font-medium">
                {['Pn','Wt','Śr','Czw','Pt','Sob','Ndz'].map(d=> <span key={d} className="py-1">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map(({ iso, d, entry, isFuture, isToday, isFull, count, times, hasNote }) => (
                      <button key={iso} disabled={isFuture} onClick={()=> setSelectedDay({date:iso, entry: entry || {count:0, full:false, tasks:[], minutes:0, date:iso, times:0, routines:[]}})} className={['relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 text-xs font-bold transition-all py-2', isFuture ? 'bg-transparent border-transparent cursor-default' : isToday ? 'ring-2 ring-[#a78bfa] border-[#a78bfa]/30' : 'border-transparent', isFull ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-100 hover:bg-[#a78bfa]/10' : count>0 ? 'bg-[#a78bfa]/15 border-[#a78bfa]/30 text-white hover:bg-[#a78bfa]/20' : !isFuture ? 'bg-white/[0.04] text-white/40 border-white/[0.06] hover:bg-white/[0.07]' : '', !isFuture ? 'cursor-pointer hover:scale-[1.03]' : ''].join(' ')} title={`${iso}: ${entry?.routines?.join(', ') || ''} ${count ? count+' zadań' : 'brak'}${isFull && times>1 ? ` ${times}×`:''}`}>
                        <span className={['text-[15px] leading-none', isToday ? 'font-black text-[#c4b5fd]' : 'font-bold'].join(' ')}>{d.getDate()}</span>
                        <span className={['text-[10px] leading-none px-1.5 py-0.5 rounded-full font-bold', isFull ? 'bg-emerald-500/20 text-emerald-200' : count>0 ? 'bg-[#a78bfa]/20 text-white' : 'text-white/30'].join(' ')}>{times>1 ? `${times}×` : isFull ? 'PEŁNY' : count>0 ? `${count}` : '·'}</span>
                        {hasNote && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-black/20" />}
                        {dayNotes[iso]?.sleep && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#a78bfa] text-white text-[9px] font-bold grid place-items-center ring-1 ring-black/20">{dayNotes[iso].sleep}</span>}
                      </button>
                    ))}
              </div>
              <p className="text-[10px] text-white/25 mt-3 text-center">Kliknij dzień aby zobaczyć rutynę, zadania i dodać notatkę / sen 1-10</p>
            </div>
          )}
        </section>

        {/* My routines - WOW SaaS edition */}
        {!loading && routines.length > 0 && (
          <section className="space-y-6">
            {routines.map((ra, i) => {
              const expanded = expandedRoutine === ra.id
              const doneCountR = (ra.progress || []).filter((p: any) => p.status === 'DONE').length
              const totalCount = (ra.routine.tasks || []).length
              const pct = totalCount > 0 ? Math.round((doneCountR / totalCount) * 100) : 0
              const completed = ra.status === 'COMPLETED'
              const days = Array.from(new Set((ra.routine.tasks || []).map((t: any) => t.day))).sort((a: number, b: number) => a - b)
              const totalMins = (ra.routine.tasks||[]).reduce((a:number,t:any)=>a+(t.minutes||0),0)

              return (
                <div key={ra.id} className={cn('group/routine relative overflow-hidden rounded-[28px] border bg-[#0c0c14]/70 backdrop-blur-xl transition-all duration-500 rise-in', expanded ? 'border-[#a78bfa]/30 shadow-[0_20px_80px_-20px_rgba(139,92,246,0.4),0_8px_32px_-12px_rgba(0,0,0,0.5)] scale-[1.005]' : 'border-white/[0.07] hover:border-white/[0.12] hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] hover:-translate-y-1', completed ? 'ring-1 ring-[#a78bfa]/25' : '')} style={{ animationDelay: `${i * 90}ms` }} onMouseMove={spotlightHandler}>
                  {/* animated gradient border when expanded */}
                  {expanded && <div className="pointer-events-none absolute inset-0 rounded-[28px] p-px bg-gradient-to-br from-[#a78bfa]/40 via-[#2dd4bf]/20 to-transparent opacity-60" style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '1px' }} />}
                  {/* subtle mesh glow */}
                  <div className={cn('pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-[60px] transition-opacity duration-700', expanded ? 'opacity-100 bg-gradient-to-br from-[#a78bfa]/15 to-[#2dd4bf]/10' : 'opacity-0 group-hover/routine:opacity-60 bg-gradient-to-br from-[#a78bfa]/10 to-transparent')} />
                  <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-[0.03]" />
                  
                  <button onClick={() => setExpandedRoutine(expanded ? null : ra.id)} className="relative w-full flex items-center gap-4 sm:gap-5 p-5 sm:p-6 text-left">
                    {/* icon + circular progress */}
                    <div className="relative shrink-0">
                      <div className={cn('relative grid place-items-center w-[56px] h-[56px] rounded-[18px] ring-1 transition-all duration-500', completed ? 'bg-gradient-to-br from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9] ring-white/25 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.7)]' : 'bg-gradient-to-br from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9] ring-white/20 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)] group-hover/routine:shadow-[0_14px_40px_-10px_rgba(139,92,246,0.7)] group-hover/routine:scale-[1.02]')}>
                        {completed ? <Trophy className="w-6 h-6 text-white drop-shadow" /> : <Zap className="w-6 h-6 text-white drop-shadow" />}
                        {!completed && pct>0 && pct<100 && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#22c55e] ring-2 ring-[#0c0c14] animate-pulse" />}
                      </div>
                      {/* circular pct ring */}
                      <svg className="pointer-events-none absolute -inset-1.5 h-[68px] w-[68px] -rotate-90" viewBox="0 0 68 68">
                        <circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                        <circle cx="34" cy="34" r="30" fill="none" stroke={completed ? "#a78bfa" : "url(#grad-"+ra.id+")"} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${2*Math.PI*30}`} strokeDashoffset={`${2*Math.PI*30*(1-pct/100)}`} className="transition-all duration-1000 ease-out" style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))' }} />
                        <defs>
                          <linearGradient id={"grad-"+ra.id} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a78bfa" />
                            <stop offset="100%" stopColor="#2dd4bf" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn('font-display text-[17px] sm:text-[19px] font-black tracking-tight leading-tight', completed ? 'text-white' : 'text-white group-hover/routine:text-white')}>{ra.routine.title}</h3>
                        {completed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#a78bfa]/15 border border-[#a78bfa]/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#e9d5ff] shadow-[0_0_20px_-6px_rgba(139,92,246,0.5)]"><Star className="w-3 h-3 fill-[#c4b5fd]"/> Ukończona</span>
                        ) : (
                          <>
                            {ra.routine.recurring && <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#a78bfa]/20 to-[#8b5cf6]/20 border border-[#a78bfa]/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#e9d5ff]"><Repeat className="w-3 h-3" /> Codziennie</span>}
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border', pct===100 ? 'bg-[#a78bfa]/10 border-[#a78bfa]/25 text-[#c4b5fd]' : pct>0 ? 'bg-[#a78bfa]/10 border-[#a78bfa]/20 text-[#c4b5fd]' : 'bg-white/[0.04] border-white/[0.07] text-white/50')}>{pct}%</span>
                          </>
                        )}
                        {ra.endsAt && <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-white/50"><Calendar className="w-3 h-3" /> do {formatDate(ra.endsAt)}</span>}
                      </div>

                      {/* stats pills + progress bar */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white/70"><Layers className="w-3 h-3 text-[#a78bfa]"/>{days.length} {days.length===1?'dzień':'dni'}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white/70"><ListChecks className="w-3 h-3 text-[#2dd4bf]"/>{totalCount} zadań</span>
                        {totalMins>0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white/60"><Clock className="w-3 h-3 text-[#fbbf24]"/>~{totalMins} min</span>}
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-white/40 ml-1"><span className={cn('h-1.5 w-1.5 rounded-full', pct===100?'bg-[#a78bfa]': pct>60?'bg-[#a78bfa]':'bg-white/30')}/> {doneCountR}/{totalCount}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 max-w-[340px] h-[6px] rounded-full bg-white/[0.06] overflow-hidden p-[2px]">
                          <div className="relative h-full rounded-full overflow-hidden" style={{ width: '100%' }}>
                            <div className={cn('absolute inset-0 rounded-full transition-all duration-1000 ease-out', completed ? 'bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9]' : 'bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] to-[#2dd4bf]')} style={{ width: `${pct}%` }}>
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-[shimmer_2s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
                            </div>
                          </div>
                        </div>
                        <span className={cn('text-xs font-black tabular-nums tracking-wide', completed ? 'text-[#c4b5fd]' : 'text-white/60')}>{pct}%</span>
                      </div>

                      {completed && ra.routine.recurring && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[11px] font-bold text-amber-200">
                          <Clock className="w-3.5 h-3.5"/> Reset za {(() => { const ms = new Date(new Date(tick).setHours(24,0,0,0)).getTime() - tick; const h=Math.floor(ms/3600000); const m=Math.floor((ms%3600000)/60000); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`})()} <span className="text-amber-300/60">• jutro</span>
                        </div>
                      )}
                    </div>

                    <div className="hidden sm:flex flex-col items-center gap-2 shrink-0">
                      <div className={cn('grid place-items-center h-11 w-11 rounded-2xl border transition-all duration-300', expanded ? 'bg-white text-[#0a0a14] border-white rotate-180 shadow-lg' : 'bg-white/[0.06] text-white/60 border-white/[0.08] group-hover/routine:bg-white group-hover/routine:text-[#0a0a14] group-hover/routine:border-white')}>
                        <ChevronDown className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">{expanded ? 'Zwiń' : 'Rozwiń'}</span>
                    </div>
                    <ChevronDown className={cn('sm:hidden w-5 h-5 shrink-0 text-white/30 transition-transform duration-300', expanded && 'rotate-180')} />
                  </button>

                  {completed && !expanded && (
                    <div className="px-6 pb-5 flex justify-center">
                      <button onClick={(e)=>{e.stopPropagation(); handleRepeat(ra.id)}} disabled={repeatingId===ra.id} className="group/btn relative overflow-hidden inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] px-5 py-2.5 text-xs font-black text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                        <span className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover/btn:opacity-100 transition" />
                        {repeatingId===ra.id ? <Loader2 className="w-3.5 h-3.5 animate-spin relative"/> : <RotateCcw className="w-3.5 h-3.5 relative"/>} <span className="relative">Powtórz rutynę</span>
                      </button>
                    </div>
                  )}

                  {/* EXPANDED CONTENT */}
                  <div className={cn('grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]', expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                      <div className="border-t border-white/[0.06] bg-gradient-to-b from-white/[0.02] via-transparent to-transparent">
                      {ra.routine.description && (
                        <div className="mx-6 mt-5 p-4 rounded-2xl bg-gradient-to-br from-[#a78bfa]/[0.06] via-[#8b5cf6]/[0.03] to-transparent border border-[#a78bfa]/10 text-sm leading-relaxed text-white/70">
                          <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#c4b5fd]"><Wand2 className="w-3 h-3"/> O rutynie</div>
                          <div dangerouslySetInnerHTML={{__html: mdToHtml(ra.routine.description)}} />
                        </div>
                      )}

                      {/* timeline */}
                      <div className="px-5 sm:px-6 pb-6 pt-2">
                        <div className="relative">
                          {/* vertical connector */}
                          <div className="absolute left-[18px] top-6 bottom-6 w-px bg-gradient-to-b from-[#a78bfa]/30 via-[#a78bfa]/15 to-transparent hidden sm:block" />
                          <div className="space-y-8">
                          {days.map((d, dayIdx) => {
                            const dayTasks = ra.routine.tasks.filter((t) => t.day === d)
                            const dayDone = dayTasks.filter((t) => ra.progress.find((p) => p.taskId === t.id)?.status === 'DONE').length
                            const dayPct = dayTasks.length ? Math.round((dayDone / dayTasks.length) * 100) : 0
                            const isDayDone = dayDone === dayTasks.length && dayTasks.length>0
                            return (
                              <div key={d} className="relative" style={{ animationDelay: `${dayIdx*80}ms` }}>
                                {/* day header */}
                                <div className="flex items-center gap-3 mb-4 sm:pl-10">
                                    <span className={cn('hidden sm:grid place-items-center absolute left-0 w-9 h-9 rounded-xl ring-1 text-xs font-black shadow-lg', isDayDone ? 'bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] text-white ring-[#a78bfa]/30 shadow-[0_6px_18px_-6px_rgba(139,92,246,0.6)]' : dayPct>0 ? 'bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] text-white ring-white/15' : 'bg-white/[0.06] text-white/40 ring-white/10')}>
                                    {isDayDone ? <Check className="w-4 h-4" strokeWidth={3}/> : d}
                                  </span>
                                  <div className="flex items-center gap-3 flex-wrap">
                                      <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] border', isDayDone ? 'bg-[#a78bfa]/10 border-[#a78bfa]/25 text-[#c4b5fd]' : 'bg-gradient-to-br from-[#a78bfa]/15 to-[#2dd4bf]/10 border-[#a78bfa]/20 text-[#e9d5ff]')}>
                                        <span className={cn('h-1.5 w-1.5 rounded-full', isDayDone ? 'bg-[#a78bfa]' : 'bg-[#a78bfa] animate-pulse')}/> Dzień {String(d).padStart(2,'0')}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/50"><Clock className="w-3 h-3"/>{dayTasks.reduce((a,t:any)=>a+(t.minutes||0),0)} min</span>
                                      <span className={cn('text-xs font-bold tabular-nums', isDayDone ? 'text-[#c4b5fd]' : 'text-white/50')}>{dayDone}/{dayTasks.length}</span>
                                  </div>
                                  <div className="ml-auto hidden sm:flex items-center gap-2">
                                    <div className="h-1.5 w-24 rounded-full bg-white/[0.06] overflow-hidden">
                                      <div className={cn('h-full rounded-full transition-all duration-700', isDayDone ? 'bg-gradient-to-r from-[#a78bfa] to-[#6d28d9]' : 'bg-gradient-to-r from-[#a78bfa] to-[#2dd4bf]')} style={{ width: `${dayPct}%` }} />
                                    </div>
                                      <span className={cn('text-[11px] font-black tabular-nums min-w-[36px] text-right', isDayDone ? 'text-[#c4b5fd]' : 'text-white/40')}>{dayPct}%</span>
                                  </div>
                                </div>
                                {/* mobile progress */}
                                <div className="sm:hidden h-1 rounded-full bg-white/[0.06] overflow-hidden mb-4 ml-1">
                                  <div className={cn('h-full rounded-full transition-all duration-700', isDayDone ? 'bg-gradient-to-r from-[#a78bfa] to-[#6d28d9]' : 'bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6]')} style={{ width: `${dayPct}%` }} />
                                </div>

                                <div className="space-y-3 sm:pl-10">
                                  {(() => {
                                    const firstPendingIdx = dayTasks.findIndex(t => (ra.progress.find(p=>p.taskId===t.id)?.status !== 'DONE'))
                                    return dayTasks.map((t, ti) => {
                                    const tp = ra.progress.find((p) => p.taskId === t.id)
                                    const done = tp?.status === 'DONE'
                                    const isNext = !done && ti === firstPendingIdx
                                    const accents = [
                                      { bar: '#a78bfa', glow: 'rgba(167,139,250,0.5)', soft: 'rgba(167,139,250,0.10)' },
                                      { bar: '#2dd4bf', glow: 'rgba(45,212,191,0.45)', soft: 'rgba(45,212,191,0.10)' },
                                      { bar: '#fbbf24', glow: 'rgba(251,191,36,0.45)', soft: 'rgba(251,191,36,0.10)' },
                                      { bar: '#38bdf8', glow: 'rgba(56,189,248,0.45)', soft: 'rgba(56,189,248,0.10)' },
                                      { bar: '#f472b6', glow: 'rgba(244,114,182,0.45)', soft: 'rgba(244,114,182,0.10)' },
                                    ]
                                    const ac = accents[ti % accents.length]
                                    const hasGif = !!t.gifUrl
                                    return (
                                      <div
                                        key={t.id}
                                        onClick={()=> { killGifPreview(); setSelectedTask(t); setSelectedAssignment(ra) }}
                                        onMouseEnter={(e)=>{ if (t.gifUrl && canHover()) openGifPreview(t.gifUrl, t.title, e.clientX, e.clientY) }}
                                        onMouseMove={(e)=>{ gifTarget.current = { x: e.clientX, y: e.clientY } }}
                                        onMouseLeave={closeGifPreview}
                                        style={{ animationDelay: `${Math.min(ti * 60 + dayIdx*40, 400)}ms` }}
                                        className={cn(
                                          'rise-in group/task relative flex items-center gap-4 rounded-[20px] p-4 border cursor-pointer overflow-hidden transition-all duration-300',
                                          'hover:-translate-y-[2px] hover:scale-[1.005]',
                                          isNext && !done ? 'ring-1 ring-[#a78bfa]/25 shadow-[0_12px_40px_-12px_rgba(139,92,246,0.45)]' : '',
                                          done
                                            ? 'bg-gradient-to-br from-[#a78bfa]/[0.09] via-[#8b5cf6]/[0.04] to-transparent border-[#a78bfa]/25 opacity-95 hover:opacity-100 shadow-[0_8px_32px_-12px_rgba(139,92,246,0.35)]'
                                            : isNext ? 'bg-gradient-to-br from-white/[0.055] via-[#a78bfa]/[0.05] to-white/[0.03] border-[#a78bfa]/25'
                                            : 'bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12]',
                                        )}
                                      >
                                        {/* left accent */}
                                        <span className="pointer-events-none absolute left-0 top-3 bottom-3 w-[4px] rounded-full transition-all duration-300 group-hover/task:top-2 group-hover/task:bottom-2" style={{ background: done ? '#a78bfa' : ac.bar, boxShadow: `0 0 14px ${done ? 'rgba(139,92,246,0.55)' : ac.glow}`, opacity: done ? 0.9 : 0.9 }} />
                                        <span className="pointer-events-none absolute -top-14 -right-14 h-32 w-32 rounded-full blur-2xl opacity-0 group-hover/task:opacity-100 transition duration-500" style={{ background: ac.soft }} />
                                        {isNext && !done && (
                                          <span className="pointer-events-none absolute -top-px left-6 inline-flex items-center gap-1 rounded-b-lg bg-gradient-to-r from-[#a78bfa] to-[#6d28d9] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow">NASTĘPNY</span>
                                        )}

                                        {/* JEDYNE kółko */}
                                        <button
                                          onClick={(e)=>{e.stopPropagation(); toggleRoutineTask(ra, t.id)}}
                                          disabled={togglingTask === t.id}
                                          aria-label={done ? 'Cofnij' : 'Zalicz'}
                                          className={cn('relative shrink-0 grid place-items-center w-[44px] h-[44px] rounded-[13px] transition-all duration-200 active:scale-90 cursor-pointer select-none',
                                            done
                                              ? 'bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] text-white ring-1 ring-white/25 shadow-[0_6px_18px_-6px_rgba(139,92,246,0.7)]'
                                              : isNext ? 'bg-white text-[#0a0a14] shadow-md hover:scale-[1.04]'
                                              : 'bg-white/[0.07] text-white/40 border border-white/10 hover:bg-white hover:text-[#0a0a14] hover:border-white hover:scale-[1.04]'
                                          )}
                                        >
                                          {togglingTask === t.id ? <Loader2 className="w-5 h-5 animate-spin" /> : done ? <Check className="w-5 h-5" strokeWidth={3} /> : isNext ? <Play className="w-4 h-4 ml-0.5 fill-[#0a0a14]" /> : <Circle className="w-5 h-5" />}
                                          {done && <span className="pointer-events-none absolute inset-0 rounded-[13px] ring-1 ring-[#a78bfa]/40 animate-[ping_1s_cubic-bezier(0,0,0.2,1)_1]" />}
                                        </button>

                                        {/* tytuł + minimal meta */}
                                        <div className="flex-1 min-w-0">
                                          <h4 className={cn('text-[15px] font-bold leading-snug tracking-tight pr-2', done ? 'text-white/35 line-through decoration-white/15' : 'text-white')}>
                                            {t.title}
                                          </h4>
                                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                            {t.minutes && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border', done ? 'bg-white/[0.03] border-white/[0.06] text-white/25' : 'bg-white/[0.06] border-white/[0.08] text-white/50')}><Clock className="w-3 h-3"/>{t.minutes} min</span>}
                                            {t.video?.url && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border', done ? 'bg-white/[0.03] border-white/[0.06] text-white/25' : 'bg-[#a78bfa]/10 border-[#a78bfa]/15 text-[#c4b5fd]')}><Film className="w-3 h-3"/>Wideo</span>}
                                            {hasGif && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border', done ? 'bg-white/[0.03] border-white/[0.06] text-white/25' : 'bg-[#a78bfa]/10 border-[#a78bfa]/20 text-[#c4b5fd] group-hover/task:bg-[#a78bfa]/15 group-hover/task:border-[#a78bfa]/30 transition')}><ImageIcon className="w-3 h-3"/>GIF</span>}
                                            {done && <span className="inline-flex items-center gap-1 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/20 px-2 py-0.5 text-[11px] font-semibold text-[#c4b5fd]"><Check className="w-3 h-3"/>Zaliczone</span>}
                                            {!done && <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-white/25">• kliknij by zobaczyć opis</span>}
                                          </div>
                                        </div>

                                        {/* strzałka — podgląd GIF-a wyskakuje za kursorem */}
                                        <span className={cn('hidden sm:grid place-items-center shrink-0 h-9 w-9 rounded-xl border transition-all duration-300', done ? 'bg-[#a78bfa]/10 border-[#a78bfa]/25 text-[#c4b5fd]' : 'bg-white/[0.04] border-white/[0.06] text-white/20 group-hover/task:bg-white group-hover/task:text-[#0a0a14] group-hover/task:border-white group-hover/task:scale-105')}>
                                          <ArrowRight className="w-4 h-4" />
                                        </span>
                                      </div>
                                    )
                                  })
                                  })()}
                                </div>
                              </div>
                            )
                          })}
                          </div>
                        </div>

                        {completed && (
                          <div className="mt-6 flex justify-center">
                            <button onClick={()=>handleRepeat(ra.id)} disabled={repeatingId===ra.id} className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-5 py-2.5 text-xs font-bold text-white/70 hover:text-white hover:border-[#a78bfa]/30 hover:bg-white/[0.08] transition">
                              {repeatingId===ra.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <RotateCcw className="w-4 h-4"/>} Powtórz rutynę od nowa
                            </button>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* Dobra robota - wszystkie zadania zrobione.
            Pokazuj TYLKO gdy dziś jest aktywność w kalendarzu I nic nie czeka:
            - po resecie rutyny (Powtórz / nowy dzień) progress wraca do PENDING -> ukryj
            - nowy dzień bez aktywności -> ukryj (todayEntry puste)
            - zaległe zwykłe zadania (pendingCount>0) -> ukryj */}
        {(() => {
          const todayIso = toLocalDate(new Date())
          const todayEntry = overallHistory?.calendar?.find((d:any)=> d.date===todayIso)
          const hasActivityToday = !!todayEntry && (todayEntry.count ?? 0) > 0
          const allRoutinesDone = routines.length===0 ? true : routines.every(ra=> ra.routine.tasks.length>0 && ra.progress.filter((p:any)=>p.status==='DONE').length >= ra.routine.tasks.length)
          const hasRoutines = routines.length>0
          const nothingPending = pendingCount===0 && (!hasRoutines || allRoutinesDone)
          const showDone = !loading && !loadingOverall && hasActivityToday && nothingPending && (hasRoutines || assignments.length>0)
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
                        <button onClick={() => { const r=routines[0]; if(r){ const t=r.routine.tasks[0]; if(t) setActiveTimer({assignment:r, task: { ...t, id: '', title: c.title, minutes: parseInt(c.title.match(/\d+/)?.[0]||'10') } as any}) } }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#c4b5fd] hover:text-white">Start <Timer className="w-3.5 h-3.5"/></button>
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
              // Ćwiczenia dodatkowe (ad-hoc, puste id) logują minuty, ale NIE odhaczają losowego zadania z rutyny
              const known = activeTimer.assignment.routine.tasks.some((t) => t.id === activeTimer.task.id)
              fetch('/api/practice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: actualMinutes, taskId: known ? activeTimer.task.id : null, assignmentId: activeTimer.assignment.id }) }).catch(() => undefined)
              if (known) toggleRoutineTask(activeTimer.assignment, activeTimer.task.id)
              else setActiveTimer(null)
            }} />
        )}

        {selectedDay && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={()=>setSelectedDay(null)} />
            <div className="glass-liquid relative w-full max-w-sm rounded-3xl p-6 animate-rise-in">
              <button onClick={()=>setSelectedDay(null)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl text-white/50 hover:text-white hover:bg-white/5"><X className="w-4 h-4"/></button>
              <div className="flex items-center gap-2"><p className="text-[11px] uppercase tracking-widest text-[#c4b5fd] font-bold">{selectedDay.date}</p><button onClick={async ()=>{ if(confirm(`Zresetować dzień ${selectedDay.date}?`)){ await fetch('/api/calendar/reset-day',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({date:selectedDay.date})}); load(); loadOverallHistory(); setSelectedDay(null) } }} className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-red-300 hover:border-red-500/20 hover:bg-red-500/10 opacity-60 hover:opacity-100 transition"><RotateCcw className="w-3 h-3"/> Resetuj dzień</button></div>
              <h3 className="font-display text-lg font-bold text-white mt-1">{selectedDay.entry.full ? '✓ Pełny trening' : selectedDay.entry.count>0 ? '• Za mało — niepełny' : 'Brak treningu'}</h3>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className={cn('px-3 py-1.5 rounded-full border font-semibold', selectedDay.entry.full ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : selectedDay.entry.count>0 ? 'bg-[#a78bfa]/10 border-[#a78bfa]/20 text-[#c4b5fd]' : 'bg-white/[0.03] border-white/[0.06] text-white/40')}>{selectedDay.entry.count} zadań</span>
                {selectedDay.entry.minutes ? <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/60 text-xs">{selectedDay.entry.minutes} min</span> : null}
                {selectedDay.entry.tasks?.length ? <span className="text-white/40 text-xs">{selectedDay.entry.tasks.length} szczegółów</span> : null}
              </div>
              {selectedDay.entry.tasks?.length > 0 && (
                <div className="mt-4 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {selectedDay.entry.tasks.map((t:any)=> <div key={t.taskId || t.title} className="flex items-center gap-2 text-sm bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0"/><span className="truncate text-white/80">{t.tasksDone !== undefined ? `${t.routineTitle || 'Rutyna'} — ${t.tasksDone ?? 0}/${t.tasksTotal ?? 0}` : t.title || 'Zadanie'}</span><span className="ml-auto text-[11px] text-white/40">{t.tasksDone !== undefined ? `${t.tasksDone ?? 0}×` : `D${t.day ?? 1}`}</span></div>)}
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

        {/* Pływający podgląd GIF-a — goni kursor z lerpem (tylko desktop z myszką) */}
        {gifPreview && (
          <div ref={gifPreviewRef} className="pointer-events-none fixed left-0 top-0 z-[70] hidden md:block w-[344px] will-change-transform">
            <div className="relative">
              <div className="absolute -inset-2 rounded-[20px] bg-gradient-to-br from-[#a78bfa]/25 via-[#2dd4bf]/10 to-transparent blur-xl" />
              <div className={cn('yt-force-dark relative overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a12]/95 backdrop-blur-xl shadow-[0_32px_80px_-20px_rgba(139,92,246,0.55),0_16px_40px_-12px_rgba(0,0,0,0.7)]', gifClosing ? 'gif-exit' : 'gif-enter')}>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-[#a78bfa]/[0.08] to-transparent border-b border-white/[0.07]">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] shadow"><Play className="w-3 h-3 text-white fill-white" /></span>
                  <p className="flex-1 truncate text-[13px] font-bold text-white">{gifPreview.title}</p>
                  <span className="inline-flex items-center rounded-md bg-[#a78bfa]/15 border border-[#a78bfa]/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#c4b5fd]">GIF</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gifPreview.src} alt={gifPreview.title} className="w-full h-auto max-h-[240px] object-contain bg-black" />
                <div className="flex items-center justify-between px-3.5 py-2 border-t border-white/[0.07] bg-white/[0.02]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Podgląd demo</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#c4b5fd]">kliknij po szczegóły <ArrowRight className="w-3 h-3" /></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTask && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={()=>{ setSelectedTask(null); setSelectedAssignment(null) }} />
            <div className="glass-liquid relative w-full max-w-lg rounded-3xl overflow-hidden animate-rise-in max-h-[90vh] overflow-y-auto">
              {selectedTask.gifUrl && <div className="bg-black shrink-0 grid place-items-center border-b border-white/[0.06]"><img decoding="async" src={selectedTask.gifUrl} alt={selectedTask.title} className="w-full h-auto max-h-[340px] object-contain" /></div>}
              <div className="p-6">
                <button onClick={()=>{ setSelectedTask(null); setSelectedAssignment(null) }} className="yt-force-dark absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl bg-black/40 text-white/70 hover:text-white"><X className="w-4 h-4"/></button>
                <h3 className="font-display text-xl font-bold text-white pr-8">{selectedTask.title}</h3>
                {selectedTask.description && <div className="text-sm text-white/70 mt-2 leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: mdToHtml(selectedTask.description)}} />}
                {selectedTask.video?.url && (
                  <div className="mt-4 rounded-2xl overflow-hidden bg-black border border-white/[0.08]">
                    {getYouTubeId(selectedTask.video.url) ? (
                      <div className="aspect-video">
                        <YoutubeCustomPlayer videoId={getYouTubeId(selectedTask.video.url)!} title={selectedTask.video.title} watermark={watermark} dbVideoId={selectedTask.video.id} />
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
                {selectedTask.minutes && selectedAssignment && (
                  <button
                    onClick={() => { setActiveTimer({ assignment: selectedAssignment, task: selectedTask }); setSelectedTask(null); setSelectedAssignment(null) }}
                    className="mt-3 w-full h-12 rounded-2xl text-sm font-bold text-white bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] hover:opacity-90 transition inline-flex items-center justify-center gap-2 shadow-[0_8px_28px_-8px_rgba(139,92,246,0.6)]"
                  >
                    <Timer className="w-4 h-4" /> Start — {selectedTask.minutes} min treningu
                  </button>
                )}
                <button onClick={()=>{ setSelectedTask(null); setSelectedAssignment(null) }} className="mt-6 w-full h-11 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white font-semibold hover:bg-white/[0.1]">Zamknij</button>
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
