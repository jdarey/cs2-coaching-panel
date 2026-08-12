'use client'

import { useState } from 'react'
import { formatDate, getInitials, cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Plus,
  Search,
  UserPlus,
  Trash2,
  Edit,
  Eye,
  Mail,
  User,
  Lock,
  Loader2,
  X,
  Users,
  Activity,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { getRank, getLevel } from '@/lib/gamification'
import { RankEmblem } from '@/components/rank-emblem'

interface Student {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  _count: { sessionsAsStudent: number; videoProgress: number }
  progressStats: { total: number; pending: number; watching: number; watched: number; implemented: number }
}

interface CoachStudentsClientProps {
  initialStudents: Student[]
}

const PROGRESS_DOTS: { key: 'total' | 'pending' | 'watched' | 'implemented'; label: string; color: string }[] = [
  { key: 'total', label: 'Wszystkie', color: '#8b5cf6' },
  { key: 'pending', label: 'Do oglądania', color: '#fbbf24' },
  { key: 'watched', label: 'Obejrzane', color: '#34d399' },
  { key: 'implemented', label: 'Wdrożone', color: '#a78bfa' },
]


export function CoachStudentsClient({ initialStudents }: CoachStudentsClientProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ email: '', name: '', password: '' })
  const { toast } = useToast()

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      setStudents((prev) => [data, ...prev])
      setDialogOpen(false)
      setFormData({ email: '', name: '', password: '' })
      toast({ title: 'Sukces', description: 'Uczeń został dodany' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego ucznia? Ta akcja jest nieodwracalna.')) return

    try {
      const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      setStudents((prev) => prev.filter((s) => s.id !== studentId))
      toast({ title: 'Sukces', description: 'Uczeń został usunięty' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    }
  }

  const openEditDialog = (student: Student) => {
    setEditingStudent(student)
    setFormData({ email: student.email, name: student.name || '', password: '' })
    setDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingStudent(null)
    setFormData({ email: '', name: '', password: '' })
    setDialogOpen(true)
  }

  const getProgressColor = (status: keyof Student['progressStats']) => {
    switch (status) {
      case 'implemented': return 'bg-purple-100 text-purple-800'
      case 'watched': return 'bg-green-100 text-green-800'
      case 'watching': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressLabel = (status: keyof Student['progressStats']) => {
    switch (status) {
      case 'implemented': return 'Wdrożone'
      case 'watched': return 'Obejrzane'
      case 'watching': return 'Ogląda'
      case 'pending': return 'Do oglądania'
      default: return status
    }
  }

  const totalStudents = students.length
  const activeStudents = students.filter((s) => s.progressStats.total > 0).length
  const newStudents = students.filter((s) => {
    const created = new Date(s.createdAt)
    const days = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    return days <= 14
  }).length
  const avgCompletion =
    students.length === 0
      ? 0
      : Math.round(
          (students.reduce((acc, s) => {
            if (s.progressStats.total === 0) return acc
            return acc + (s.progressStats.watched + s.progressStats.implemented) / s.progressStats.total
          }, 0) /
            students.length) *
            100
        )

  const stats = [
    { icon: Users, label: 'Uczniowie', value: totalStudents, color: '#8b5cf6' },
    { icon: Activity, label: 'Aktywni', value: activeStudents, color: '#a78bfa' },
    { icon: Sparkles, label: 'Nowi', value: newStudents, color: '#fbbf24' },
    { icon: TrendingUp, label: 'Średnio', value: `${avgCompletion}%`, color: '#34d399' },
  ]

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <PageHeader
          icon={UserPlus}
          label="Twoja drużyna"
          title="Uczniowie"
          subtitle="Zarządzaj swoimi uczniami i śledź ich postępy"
        >
          <button
            onClick={openAddDialog}
            className="group relative inline-flex items-center gap-2 rounded-full px-6 h-12 text-sm font-semibold text-white btn-primary-gradient"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Dodaj ucznia</span>
            <span className="sm:hidden">Dodaj</span>
          </button>
        </PageHeader>

        {/* ===== Stats strip ===== */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label} className="glass-liquid rise-in rounded-2xl p-4 relative overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-[#a78bfa]/25"
              style={{ animationDelay: `${0.05 + i * 0.06}s` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="relative w-10 h-10 rounded-xl grid place-items-center shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${stat.color}22 0%, ${stat.color}08 100%)`,
                    border: `1px solid ${stat.color}33`,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-xl blur-md opacity-50"
                    style={{ background: `${stat.color}33` }}
                  />
                  <stat.icon className="relative w-5 h-5" style={{ color: stat.color }} strokeWidth={2.1} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 font-medium">{stat.label}</p>
                  <p className="font-display text-2xl font-bold text-white mt-0.5 leading-none">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== Glass search input ===== */}
        <div className="mt-6 relative max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#c4b5fd] transition-colors duration-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Szukaj ucznia po nazwisku lub emailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-liquid h-12 w-full rounded-xl pl-11 pr-10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/25 focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/25 focus:border-[#a78bfa]/40 transition-all duration-300"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-300"
              aria-label="Wyczyść"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ===== Students list / empty state ===== */}
        {filteredStudents.length === 0 ? (
          <div
            className="glass-liquid rise-in mt-6 rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden" >
            <div
              className="mx-auto mb-6 grid place-items-center w-20 h-20 rounded-3xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(45,229,202,0.25) 0%, rgba(124,58,237,0.10) 100%)',
                border: '1px solid rgba(45,229,202,0.3)',
              }}
            >
              <div
                className="absolute inset-0 opacity-40 blur-2xl animate-aurora text-gradient-mesh"
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 45%, #6d28d9 100%)' }}
              />
              {search ? (
                <Search className="relative w-9 h-9 text-[#c4b5fd]" strokeWidth={1.8} />
              ) : (
                <UserPlus className="relative w-9 h-9 text-[#c4b5fd]" strokeWidth={1.8} />
              )}
            </div>
            <h3 className="font-display text-2xl font-bold text-white">
              {search ? 'Brak wyników' : 'Nie masz jeszcze uczniów'}
            </h3>
            <p className="mt-2 text-sm text-white/45 max-w-md mx-auto">
              {search
                ? 'Nie znaleziono uczniów pasujących do wyszukiwania. Zmień frazę lub wyczyść pole.'
                : 'Dodaj pierwszego ucznia, aby zacząć prowadzić sesje i śledzić postępy.'}
            </p>
            {!search && (
              <button
                onClick={openAddDialog}
                className=" relative mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white overflow-hidden transition-all duration-300 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)',
                }}
              >
                <UserPlus className="relative w-4 h-4" strokeWidth={2.4} />
                <span className="relative">Dodaj pierwszego ucznia</span>
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredStudents.map((student, i) => {
              const completion =
                student.progressStats.total > 0
                  ? Math.round(
                      ((student.progressStats.watched + student.progressStats.implemented) /
                        student.progressStats.total) *
                        100
                    )
                  : 0
              const rank = getRank(completion)
              const levelInfo = getLevel(student.progressStats.watched + student.progressStats.implemented)
              return (
                <div
                  key={student.id} className="glass-liquid rise-in group relative rounded-3xl p-6 hover:border-[#a78bfa]/25 overflow-hidden"
                  style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                    {/* Left: avatar + name/email */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#a78bfa]/45 to-[#6d28d9]/25 opacity-60 blur-md group-hover:opacity-100 transition-opacity duration-500" />
                        <Avatar className="relative h-12 w-12 rounded-xl ring-1 ring-white/15">
                          <AvatarImage src={student.avatarUrl || ''} alt={student.name || ''} />
                          <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] text-white font-display font-semibold">
                            {getInitials(student.name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-bold text-white transition-colors duration-300 group-hover:text-[#c4b5fd] truncate">
                          {student.name || 'Bez nazwy'}
                        </h3>
                        <p className="mt-0.5 text-sm text-white/45 truncate flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{student.email}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right: action menu — row of glass ghost icons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/coach/students/${student.id}`}
                        className="group/act relative grid place-items-center w-9 h-9 rounded-xl border border-white/[0.06] bg-violet-500/[0.08] hover:bg-violet-500/15 hover:border-[#a78bfa]/30 transition-all duration-300"
                        title="Zobacz szczegóły"
                      >
                        <Eye className="w-4 h-4 text-[#c4b5fd] group-hover/act:scale-110 transition-transform duration-300" strokeWidth={2.1} />
                      </Link>
                      <button
                        onClick={() => openEditDialog(student)}
                        className="group/act relative grid place-items-center w-9 h-9 rounded-xl border border-white/[0.06] bg-blue-500/[0.08] hover:bg-blue-500/15 hover:border-blue-400/30 transition-all duration-300"
                        title="Edytuj"
                      >
                        <Edit className="w-4 h-4 text-[#a78bfa] group-hover/act:scale-110 transition-transform duration-300" strokeWidth={2.1} />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="group/act relative grid place-items-center w-9 h-9 rounded-xl border border-white/[0.06] bg-red-500/10 hover:bg-red-500/15 hover:border-red-500/30 transition-all duration-300"
                        title="Usuń"
                      >
                        <Trash2 className="w-4 h-4 text-red-300 group-hover/act:scale-110 transition-transform duration-300" strokeWidth={2.1} />
                      </button>
                    </div>
                  </div>

                  {/* Stat chips: 4 micro glass pills */}
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {PROGRESS_DOTS.map(({ key, label, color }) => {
                      const count = student.progressStats[key]
                      if (count === 0 && key !== 'total') return null
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white/70 backdrop-blur-md"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                          />
                          {label}: <span className="text-white font-semibold">{count}</span>
                        </span>
                      )
                    })}
                  </div>

                  {/* Completion bar + join/sessions meta */}
                  <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-white/45">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-white/35">Dołączył:</span>
                      <span className="text-white/65">{formatDate(student.createdAt)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-white/35">Sesje:</span>
                      <span className="text-white/65 font-medium">{student._count.sessionsAsStudent}</span>
                    </span>
                    {student.progressStats.total > 0 && (
                      <div className="flex items-center gap-2.5 ml-auto flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-white/55">
                          <RankEmblem rank={rank} size={22} glow={false} />
                          {rank.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-white/45">
                          Lv.{levelInfo.level}
                        </span>
                        <div className="h-1.5 w-28 rounded-full bg-white/[0.05] overflow-hidden border border-white/[0.04]">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${completion}%`,
                              background: 'linear-gradient(90deg, #34d399 0%, #8b5cf6 100%)',
                            }}
                          />
                        </div>
                        <span className="text-[#c4b5fd] font-semibold tabular-nums">{completion}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== Premium add/edit dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-md p-0 border-transparent bg-transparent shadow-none sm:rounded-3xl"
        >
          <div className="glass-liquid rounded-3xl p-7 sm:p-8 relative overflow-hidden">
            {/* Aurora glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[#a78bfa]/10 blur-3xl animate-aurora-slow pointer-events-none" />
            <div className="absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-[#6d28d9]/10 blur-3xl animate-aurora pointer-events-none" />

            <DialogHeader className="relative">
              <div className="flex items-center gap-3 mb-1">
                <div className="relative w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]">
                  <UserPlus className="w-5 h-5 text-white" strokeWidth={2.2} />
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-white/25" />
                </div>
                <DialogTitle className="font-display text-xl font-bold text-gradient-violet">
                  {editingStudent ? 'Edytuj ucznia' : 'Dodaj nowego ucznia'}
                </DialogTitle>
              </div>
            </DialogHeader>

            <form onSubmit={handleAddStudent} className="relative space-y-4 mt-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-white/70">
                  Email <span className="text-[#c4b5fd]">*</span>
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#c4b5fd] transition-colors duration-300 pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="uczen@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={isLoading || !!editingStudent}
                    className="h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] ring-1 ring-white/15 pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/25 focus-visible:border-[#a78bfa]/40 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-white/70">
                  Imię <span className="text-white/30">(opcjonalnie)</span>
                </Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#c4b5fd] transition-colors duration-300 pointer-events-none" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Jan Kowalski"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] ring-1 ring-white/15 pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/25 focus-visible:border-[#a78bfa]/40 transition-all duration-300"
                  />
                </div>
              </div>

              {!editingStudent && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-white/70">
                    Hasło <span className="text-[#c4b5fd]">*</span>
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#c4b5fd] transition-colors duration-300 pointer-events-none" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="minimum 6 znaków"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                      disabled={isLoading}
                      className="h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] ring-1 ring-white/15 pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/25 focus-visible:border-[#a78bfa]/40 transition-all duration-300"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="mt-6 gap-2 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className=" relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white overflow-hidden transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)',
                    }}
                >
                  {isLoading ? <Loader2 className="relative w-4 h-4 animate-spin" /> : null}
                  <span className="relative">{editingStudent ? 'Zapisz' : 'Dodaj ucznia'}</span>
                </button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  )
}
