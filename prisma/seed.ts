import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo coach
  const coachPassword = await bcrypt.hash('password123', 12)
  const coach = await prisma.user.upsert({
    where: { email: 'coach@test.com' },
    update: {},
    create: {
      email: 'coach@test.com',
      passwordHash: coachPassword,
      name: 'Demo Coach',
      role: 'COACH',
    },
  })
  console.log('✅ Coach created:', coach.email)

  // Create demo student
  const studentPassword = await bcrypt.hash('password123', 12)
  const student = await prisma.user.upsert({
    where: { email: 'student@test.com' },
    update: {},
    create: {
      email: 'student@test.com',
      passwordHash: studentPassword,
      name: 'Demo Student',
      role: 'STUDENT',
      coachId: coach.id,
    },
  })
  console.log('✅ Student created:', student.email)

  // Create default tags
  const defaultTags = [
    { name: 'Peeking', description: 'Błędy związane z peekowaniem', color: '#EF4444', icon: 'Target' },
    { name: 'Crosshair Placement', description: 'Złe ustawienie celownika', color: '#3B82F6', icon: 'Crosshair' },
    { name: 'Economy', description: 'Błędy w zarządzaniu ekonomią', color: '#F59E0B', icon: 'Coins' },
    { name: 'Positioning', description: 'Złe pozycjonowanie na mapie', color: '#22C55E', icon: 'MapPin' },
    { name: 'Communication', description: 'Brak lub złe info', color: '#8B5CF6', icon: 'MessageSquare' },
    { name: 'Utility Usage', description: 'Niewłaściwe użycie granatów', color: '#EC4899', icon: 'Bomb' },
    { name: 'Clutch', description: 'Błędy w sytuacjach 1vX', color: '#F97316', icon: 'Trophy' },
    { name: 'Entry Fragging', description: 'Problemy z wejściem na bombsite', color: '#06B6D4', icon: 'Zap' },
  ]

  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: { name_coachId: { name: tag.name, coachId: coach.id } },
      update: {},
      create: { ...tag, coachId: coach.id },
    })
  }
  console.log('✅ Default tags created')

  // Create sample videos
  const videos = [
    {
      title: 'Perfect Peeking Mechanics',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      description: 'Jak poprawnie peekować i wygrywać aim duelle',
      source: 'youtube',
      tagNames: ['Peeking', 'Crosshair Placement'],
    },
    {
      title: 'Crosshair Placement Masterclass',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      description: 'Zawsze miej celownik na wysokości głowy',
      source: 'youtube',
      tagNames: ['Crosshair Placement', 'Positioning'],
    },
    {
      title: 'Economy Management Guide',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      description: 'Kiedy kupować, kiedy oszczędzać - kompletny poradnik',
      source: 'youtube',
      tagNames: ['Economy'],
    },
    {
      title: 'Utility Usage on Mirage',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      description: 'Wszystkie smoke, flash i moloty na Mirage',
      source: 'youtube',
      tagNames: ['Utility Usage', 'Positioning'],
    },
    {
      title: 'Communication Basics',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      description: 'Jak dawać dobre info i nie zacierać teamowi',
      source: 'youtube',
      tagNames: ['Communication'],
    },
  ]

  const createdVideos = []
  for (const video of videos) {
    const tagIds = await Promise.all(
      video.tagNames.map(async (name) => {
        const tag = await prisma.tag.findFirst({ where: { name, coachId: coach.id } })
        return tag?.id
      })
    ).then((ids) => ids.filter(Boolean) as string[])

    const v = await prisma.video.upsert({
      where: { id: `demo-${video.title.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `demo-${video.title.toLowerCase().replace(/\s+/g, '-')}`,
        title: video.title,
        url: video.url,
        description: video.description,
        source: video.source,
        coachId: coach.id,
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    })
    createdVideos.push(v)
  }
  console.log('✅ Sample videos created')

  // Create sample session
  const session = await prisma.session.create({
    data: {
      title: 'Analiza demka - Mirage CT side',
      description: 'Przegląd 두i errors z ostatniej gry na Mirage po stronie CT',
      status: 'ACTIVE',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      coachId: coach.id,
      studentId: student.id,
      tags: {
        create: [
          { tagId: (await prisma.tag.findFirst({ where: { name: 'Peeking', coachId: coach.id } }))!.id, note: 'Za agresywne peekowanie na A site', order: 0 },
          { tagId: (await prisma.tag.findFirst({ where: { name: 'Crosshair Placement', coachId: coach.id } }))!.id, note: 'Celownik za nisko przy trzymaniu kąta', order: 1 },
          { tagId: (await prisma.tag.findFirst({ where: { name: 'Utility Usage', coachId: coach.id } }))!.id, note: 'Zapomnienie o smoke na jungle', order: 2 },
        ],
      },
      videos: {
        create: createdVideos.slice(0, 3).map((v, i) => ({ videoId: v.id, order: i })),
      },
    },
  })
  console.log('✅ Sample session created')

  // Create video progress for student
  for (const video of createdVideos.slice(0, 3)) {
    await prisma.videoProgress.create({
      data: {
        userId: student.id,
        videoId: video.id,
        sessionId: session.id,
        status: video === createdVideos[0] ? 'WATCHED' : 'PENDING',
        progress: video === createdVideos[0] ? 100 : 0,
        note: video === createdVideos[0] ? 'Bardzo pomocne, zastosuję w następnej grze' : null,
      },
    })
  }
  console.log('✅ Video progress created')

  // Create coach settings
  await prisma.coachSettings.upsert({
    where: { coachId: coach.id },
    update: {},
    create: {
      coachId: coach.id,
      notificationEmail: false,
      notificationDiscord: false,
    },
  })
  console.log('✅ Coach settings created')

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })