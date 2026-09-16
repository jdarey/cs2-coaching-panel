import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// GET: eksport całej bazy do JSON
export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

const [
    users,
    financeEntries,
    rankEntries,
    sessions,
    videos,
    assignments,
    routines,
    routineTasks,
    routineAssignments,
    messages,
    announcements,
    feedbacks,
    matchLogs,
    skillSnapshots,
    goals,
    practiceSessions,
    dayNotes,
    coachSettings,
    studentInvites,
    sessionTemplates,
    tags,
    videoTags,
    sessionTags,
    sessionVideos,
    sessionNotes,
    videoProgress,
    videoComments,
    trainingPaths,
    trainingModules,
    trainingModuleVideos,
    coachNotes,
    coachStudentNotes,
    studentInvites2,
    tags2,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.financeEntry.findMany(),
    prisma.rankEntry.findMany(),
    prisma.session.findMany(),
    prisma.video.findMany(),
    prisma.assignment.findMany(),
    prisma.routine.findMany(),
    prisma.routineTask.findMany(),
    prisma.routineAssignment.findMany(),
    prisma.message.findMany(),
    prisma.announcement.findMany(),
    prisma.feedback.findMany(),
    prisma.matchLog.findMany(),
    prisma.skillSnapshot.findMany(),
    prisma.goal.findMany(),
    prisma.practiceSession.findMany(),
    prisma.dayNote.findMany(),
    prisma.coachSettings.findMany(),
    prisma.studentInvite.findMany(),
    prisma.sessionTemplate.findMany(),
    prisma.tag.findMany(),
    prisma.videoTag.findMany(),
    prisma.sessionTag.findMany(),
    prisma.sessionVideo.findMany(),
    prisma.sessionNote.findMany(),
    prisma.videoProgress.findMany(),
    prisma.videoComment.findMany(),
    prisma.trainingPath.findMany(),
    prisma.trainingModule.findMany(),
    prisma.trainingModuleVideo.findMany(),
    prisma.coachStudentNote.findMany(),
    prisma.coachStudentNote.findMany(),
    prisma.studentInvite.findMany(),
    prisma.tag.findMany(),
    prisma.tag.findMany(),
  ])

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    users,
    financeEntries,
    rankEntries,
    sessions,
    videos,
    assignments,
    routines,
    routineTasks,
    routineAssignments,
    messages,
    announcements,
    feedbacks,
    matchLogs,
    skillSnapshots,
    goals,
    practiceSessions,
    dayNotes,
    coachSettings,
    studentInvites,
    sessionTemplates,
    tags,
    videoTags,
    sessionTags,
    sessionVideos,
    sessionNotes,
    videoProgress,
    videoComments,
    trainingPaths,
    trainingModules,
    trainingModuleVideos,
    coachNotes,
    coachStudentNotes,
  }

  await audit.backupCreated('admin', 'admin', `backup-${Date.now()}.json`)

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}

// POST: import bazy z JSON
export async function POST(request: NextRequest) {
  let admin: { id: string; role: string }
  try {
    admin = await requireAdmin()
  } catch (e) {
    return e as Response
  }

  try {
    const body = await request.json()

    // Walidacja podstawowa
    if (!body.version || !body.users) {
      return NextResponse.json({ error: 'Nieprawidłowy format pliku backupu' }, { status: 400 })
    }

    // Import w transakcji
    await prisma.$transaction(async (tx) => {
      // Users
      for (const u of body.users) {
        await tx.user.upsert({
          where: { id: u.id },
          create: u,
          update: u,
        })
      }

      // Finance entries
      for (const e of body.financeEntries || []) {
        await tx.financeEntry.upsert({
          where: { id: e.id },
          create: e,
          update: e,
        })
      }

      // Rank entries
      for (const e of body.rankEntries || []) {
        await tx.rankEntry.upsert({
          where: { id: e.id },
          create: e,
          update: e,
        })
      }

      // Sessions
      for (const s of body.sessions || []) {
        await tx.session.upsert({
          where: { id: s.id },
          create: s,
          update: s,
        })
      }

      // Videos
      for (const v of body.videos || []) {
        await tx.video.upsert({
          where: { id: v.id },
          create: v,
          update: v,
        })
      }

      // Assignments
      for (const a of body.assignments || []) {
        await tx.assignment.upsert({
          where: { id: a.id },
          create: a,
          update: a,
        })
      }

      // Routines
      for (const r of body.routines || []) {
        await tx.routine.upsert({
          where: { id: r.id },
          create: r,
          update: r,
        })
      }

      // Routine tasks
      for (const rt of body.routineTasks || []) {
        await tx.routineTask.upsert({
          where: { id: rt.id },
          create: rt,
          update: rt,
        })
      }

      // Routine assignments
      for (const ra of body.routineAssignments || []) {
        await tx.routineAssignment.upsert({
          where: { id: ra.id },
          create: ra,
          update: ra,
        })
      }

      // Messages
      for (const m of body.messages || []) {
        await tx.message.upsert({
          where: { id: m.id },
          create: m,
          update: m,
        })
      }

      // Announcements
      for (const a of body.announcements || []) {
        await tx.announcement.upsert({
          where: { id: a.id },
          create: a,
          update: a,
        })
      }

      // Feedbacks
      for (const f of body.feedbacks || []) {
        await tx.feedback.upsert({
          where: { id: f.id },
          create: f,
          update: f,
        })
      }

      // Match logs
      for (const m of body.matchLogs || []) {
        await tx.matchLog.upsert({
          where: { id: m.id },
          create: m,
          update: m,
        })
      }

      // Skill snapshots
      for (const s of body.skillSnapshots || []) {
        await tx.skillSnapshot.upsert({
          where: { id: s.id },
          create: s,
          update: s,
        })
      }

      // Goals
      for (const g of body.goals || []) {
        await tx.goal.upsert({
          where: { id: g.id },
          create: g,
          update: g,
        })
      }

      // Practice sessions
      for (const p of body.practiceSessions || []) {
        await tx.practiceSession.upsert({
          where: { id: p.id },
          create: p,
          update: p,
        })
      }

      // Day notes
      for (const d of body.dayNotes || []) {
        await tx.dayNote.upsert({
          where: { studentId_date: { studentId: d.studentId, date: d.date } },
          create: d,
          update: d,
        })
      }

      // Coach settings
      for (const c of body.coachSettings || []) {
        await tx.coachSettings.upsert({
          where: { coachId: c.coachId },
          create: c,
          update: c,
        })
      }

      // Student invites
      for (const s of body.studentInvites || []) {
        await tx.studentInvite.upsert({
          where: { id: s.id },
          create: s,
          update: s,
        })
      }

      // Session templates
      for (const s of body.sessionTemplates || []) {
        await tx.sessionTemplate.upsert({
          where: { id: s.id },
          create: s,
          update: s,
        })
      }

      // Tags
      for (const t of body.tags || []) {
        await tx.tag.upsert({
          where: { id: t.id },
          create: t,
          update: t,
        })
      }

      // Video tags
      for (const vt of body.videoTags || []) {
        await tx.videoTag.upsert({
          where: { videoId_tagId: { videoId: vt.videoId, tagId: vt.tagId } },
          create: vt,
          update: vt,
        })
      }

      // Session tags
      for (const st of body.sessionTags || []) {
        await tx.sessionTag.upsert({
          where: { id: st.id },
          create: st,
          update: st,
        })
      }

      // Session videos
      for (const sv of body.sessionVideos || []) {
        await tx.sessionVideo.upsert({
          where: { id: sv.id },
          create: sv,
          update: sv,
        })
      }

      // Session notes
      for (const sn of body.sessionNotes || []) {
        await tx.sessionNote.upsert({
          where: { id: sn.id },
          create: sn,
          update: sn,
        })
      }

      // Video progress
      for (const vp of body.videoProgress || []) {
        await tx.videoProgress.upsert({
          where: { id: vp.id },
          create: vp,
          update: vp,
        })
      }

      // Video comments
      for (const vc of body.videoComments || []) {
        await tx.videoComment.upsert({
          where: { id: vc.id },
          create: vc,
          update: vc,
        })
      }

      // Training paths
      for (const tp of body.trainingPaths || []) {
        await tx.trainingPath.upsert({
          where: { id: tp.id },
          create: tp,
          update: tp,
        })
      }

      // Training modules
      for (const tm of body.trainingModules || []) {
        await tx.trainingModule.upsert({
          where: { id: tm.id },
          create: tm,
          update: tm,
        })
      }

      // Training module videos
      for (const tmv of body.trainingModuleVideos || []) {
        await tx.trainingModuleVideo.upsert({
          where: { id: tmv.id },
          create: tmv,
          update: tmv,
        })
      }

      // Coach notes
      for (const cn of body.coachNotes || []) {
        await tx.coachStudentNote.upsert({
          where: { id: cn.id },
          create: cn,
          update: cn,
        })
      }

      // Coach student notes (other relation)
      for (const csn of body.coachStudentNotes || []) {
        await tx.coachStudentNote.upsert({
          where: { id: csn.id },
          create: csn,
          update: csn,
        })
      }

      // Student invites
      for (const s of body.studentInvites || []) {
        await tx.studentInvite.upsert({
          where: { id: s.id },
          create: s,
          update: s,
        })
      }
    })

    await audit.backupRestored(admin.id, admin.role, `restored-${Date.now()}.json`)

    return NextResponse.json({ ok: true, message: 'Baza przywrócona pomyślnie' })
  } catch (e: any) {
    console.error('Backup restore error:', e)
    return NextResponse.json({ error: e.message || 'Błąd przywracania' }, { status: 500 })
  }
}