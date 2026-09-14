import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'Podgląd ucznia',
}

export const dynamic = 'force-dynamic'

// Read-only podgląd "oczami ucznia": to samo co widzi uczeń (ELO, postęp,
// zadania, sesje, cele), ale bez logowania na jego konto. Tylko do patrzenia.
export default async function AdminUserPreviewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user as any)) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      faceitNickname: true,
      lastActiveAt: true,
      createdAt: true,
      coach: { select: { name: true, email: true } },
    },
  })
  if (!user) {
    redirect('/admin/users')
  }

  const [ranks, progress, assignments, sessions, goals] = await Promise.all([
    prisma.rankEntry.findMany({
      where: { studentId: user.id, mode: 'FACEIT' },
      orderBy: { recordedAt: 'asc' },
      take: 12,
      select: { elo: true, recordedAt: true },
    }),
    prisma.videoProgress.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: { status: true, progress: true, updatedAt: true, video: { select: { title: true } } },
    }),
    prisma.assignment.findMany({
      where: { studentId: user.id, status: 'PENDING' },
      orderBy: { dueDate: 'asc' },
      take: 6,
      select: { title: true, dueDate: true },
    }),
    prisma.session.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, status: true, createdAt: true },
    }),
    prisma.goal.findMany({
      where: { studentId: user.id, status: 'ACTIVE' },
      take: 5,
      select: { title: true, target: true, deadline: true },
    }),
  ])

  const currentElo = ranks.length ? ranks[ranks.length - 1].elo : null
  const slice = ranks.slice(-12)
  const min = slice.length ? Math.min(...slice.map((e) => e.elo ?? 0)) : 0
  const max = slice.length ? Math.max(...slice.map((e) => e.elo ?? 0)) : 0
  const range = Math.max(1, max - min)
  const fmtDay = (d: Date) => new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Warsaw' })

  return (
    <div className="pb-16">
      <p className="text-[11px] uppercase tracking-widest text-amber-300/70 font-semibold mb-1">Podgląd read-only — nic tu nie klikniesz na jego koncie</p>
      <h1 className="font-display text-2xl font-bold mb-1">{user.name || 'Uczeń'}</h1>
      <p className="text-sm text-white/45 mb-6">
        {user.email} · {user.role === 'STUDENT' ? 'Uczeń' : user.role}
        {user.coach ? ` · trener: ${user.coach.name || user.coach.email}` : ' · bez trenera'}
        {user.faceitNickname ? ` · Faceit: ${user.faceitNickname}` : ''}
      </p>

      {/* ELO */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/45 mb-3">Faceit ELO — trajektoria</p>
        {slice.length === 0 ? (
          <p className="text-sm text-white/40">Brak wpisów ELO.</p>
        ) : (
          <>
            <p className="font-display text-3xl font-bold text-white mb-3">{currentElo ?? '—'}</p>
            <div className="h-24 rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 flex items-end gap-1 overflow-hidden">
              {slice.map((e, i) => {
                const h = 16 + (((e.elo ?? 0) - min) / range) * 72
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-md bg-gradient-to-t from-[#a78bfa]/70 to-[#a78bfa]" style={{ height: `${h}%`, minHeight: 8 }} />
                    <span className="text-[7px] text-white/25">{fmtDay(e.recordedAt)}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Postęp filmów */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45 mb-3">Ostatnio oglądane</p>
          {progress.length === 0 ? (
            <p className="text-sm text-white/40">Brak aktywności.</p>
          ) : (
            <ul className="space-y-2.5">
              {progress.map((p, i) => (
                <li key={i}>
                  <p className="text-sm font-medium truncate">{p.video.title}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6]" style={{ width: `${Math.round(p.progress)}%` }} />
                  </div>
                  <p className="text-[11px] text-white/35 mt-0.5">{p.status} · {Math.round(p.progress)}% · {fmtDay(p.updatedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Zadania */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45 mb-3">Zadania do zrobienia</p>
          {assignments.length === 0 ? (
            <p className="text-sm text-white/40">Nic nie zalega. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {assignments.map((a, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{a.title}</span>
                  {a.dueDate && <span className="text-white/40 text-xs"> · termin {fmtDay(a.dueDate)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sesje */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45 mb-3">Ostatnie sesje</p>
          {sessions.length === 0 ? (
            <p className="text-sm text-white/40">Brak sesji.</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-white/40 text-xs"> · {s.status} · {fmtDay(s.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Cele */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45 mb-3">Aktywne cele</p>
          {goals.length === 0 ? (
            <p className="text-sm text-white/40">Brak celów.</p>
          ) : (
            <ul className="space-y-2">
              {goals.map((g, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{g.title}</span>
                  {g.target && <span className="text-white/40 text-xs"> · cel: {g.target}</span>}
                  {g.deadline && <span className="text-white/40 text-xs"> · do {fmtDay(g.deadline)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
