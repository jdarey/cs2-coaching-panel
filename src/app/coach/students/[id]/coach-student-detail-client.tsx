'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Mail,
  ClipboardList,
  PlayCircle,
  MessageSquare,
  Plus,
  Inbox,
} from 'lucide-react'
import { CoachLayout } from '@/components/coach-layout-export'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate, getInitials, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { getRank, getLevel } from '@/lib/gamification'
import { RankEmblem } from '@/components/rank-emblem'

interface StudentDetail {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

interface SessionSummary {
  id: string
  title: string
  status: string
  scheduledAt: string | null
  createdAt: string
  videosCount: number
  notesCount: number
  tags: { name: string; color: string }[]
}

const PROGRESS_DOTS = [
  { key: 'total', label: 'Filmy', color: '#14b8a6' },
  { key: 'pending', label: 'Do oglądania', color: '#fbbf24' },
  { key: 'watching', label: 'Ogląda', color: '#2de5ca' },
  { key: 'watched', label: 'Obejrzane', color: '#34d399' },
  { key: 'implemented', label: 'Wdrożone', color: '#2de5ca' },
] as const

export function CoachStudentDetailClient({
  student,
  progressStats,
  sessions,
}: {
  student: StudentDetail
  progressStats: Record<string, number>
  sessions: SessionSummary[]
}) {
  return (
    <CoachLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <Link
          href="/coach/students"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Powrót do uczniów
        </Link>

        {/* Profile header */}
        <div className="glass-card rise-in relative rounded-3xl p-6 md:p-8 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.04] via-transparent to-transparent" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-5 min-w-0">
              <Avatar className="h-20 w-20 rounded-2xl ring-1 ring-white/15 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]">
                <AvatarImage src={student.avatarUrl || ''} alt={student.name || student.email} />
                <AvatarFallback className="rounded-2xl bg-white text-[#060606] font-display font-bold text-2xl">
                  {getInitials(student.name || student.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight truncate">
                  {student.name || 'Bez nazwy'}
                </h1>
                <p className="mt-1.5 text-white/45 text-sm flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {student.email}
                </p>
                <p className="mt-1 text-white/35 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Uczeń od {formatDate(student.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:ml-auto md:justify-end items-center">
              {(() => {
                const total = progressStats.total ?? 0
                const completion = total > 0 ? Math.round(((progressStats.watched ?? 0) + (progressStats.implemented ?? 0)) / total * 100) : 0
                const rank = getRank(completion)
                const levelInfo = getLevel((progressStats.watched ?? 0) + (progressStats.implemented ?? 0))
                return (
                  <span className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/85">
                    <RankEmblem rank={rank} size={26} glow={false} />
                    {rank.name}
                    <span className="text-white/35">·</span>
                    Lv.{levelInfo.level}
                  </span>
                )
              })()}
              {PROGRESS_DOTS.map(({ key, label, color }) => {
                const count = progressStats[key] ?? 0
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-md"
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    {label}: <span className="text-white font-semibold">{count}</span>
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sessions header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">Sesje ucznia</h2>
            <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-white/70">
              {sessions.length}
            </span>
          </div>
          <Link
            href="/coach/sessions"
            className="btn-darey relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Nowa sesja
          </Link>
        </div>

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 md:p-16 text-center">
            <Inbox className="w-10 h-10 text-white/25 mx-auto mb-4" />
            <p className="font-display text-lg font-semibold text-white/80">Brak sesji</p>
            <p className="mt-1 text-sm text-white/40 max-w-sm mx-auto">
              Ten uczeń nie ma jeszcze żadnych sesji. Utwórz pierwszą z poziomu listy sesji.
            </p>
            <Link
              href="/coach/sessions"
              className="btn-darey relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mt-6"
            >
              <Plus className="w-4 h-4" />
              Utwórz sesję
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, i) => (
              <Link
                key={session.id}
                href={`/coach/sessions/${session.id}`}
                className="glass-card rise-in group relative block rounded-3xl p-5 md:p-6 overflow-hidden"
                style={{ animationDelay: `${0.05 + i * 0.05}s` }}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-lg font-bold truncate group-hover:text-white transition-colors">
                        {session.title}
                      </h3>
                      <Badge className={cn('rounded-full', STATUS_COLORS[session.status] || 'bg-gray-100 text-gray-800')}>
                        {STATUS_LABELS[session.status] || session.status}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-white/45 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {session.scheduledAt ? formatDate(session.scheduledAt) : 'Data nieustalona'}
                    </p>
                    {session.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {session.tags.slice(0, 4).map((tag, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
                            style={{ background: `${tag.color}1f`, color: tag.color, border: `1px solid ${tag.color}33` }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {session.tags.length > 4 && (
                          <span className="text-[11px] text-white/40 self-center">+{session.tags.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 md:gap-6 shrink-0 text-white/45">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <PlayCircle className="w-4 h-4" />
                      {session.videosCount} filmów
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <MessageSquare className="w-4 h-4" />
                      {session.notesCount} notatek
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs">
                      <ClipboardList className="w-4 h-4" />
                      Otwórz
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CoachLayout>
  )
}
