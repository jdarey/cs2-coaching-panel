'use client'

import { formatDate, formatDateTime, getInitials, STATUS_LABELS, STATUS_COLORS, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn } from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Video, BookOpen, CheckCircle, Clock, PlayCircle, TrendingUp, ArrowRight, Target, Trophy } from 'lucide-react'
import Link from 'next/link'

interface Session {
  id: string
  title: string
  description: string | null
  status: string
  scheduledAt: string | null
  coach: { id: string; name: string | null; email: string; avatarUrl: string | null }
  tags: { tag: { id: string; name: string; color: string } }[]
  videos: { video: { id: string; title: string; thumbnail: string | null } }[]
  _count: { videos: number }
}

interface Progress {
  id: string
  status: string
  progress: number
  note: string | null
  watchedAt: string | null
  video: { id: string; title: string; thumbnail: string | null; tags: { tag: { id: string; name: string; color: string } }[] }
  session: { id: string; title: string }
}

interface Coach {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface Stats {
  totalVideos: number
  pending: number
  watching: number
  watched: number
  implemented: number
  totalSessions: number
  activeSessions: number
}

interface StudentDashboardClientProps {
  initialStats: Stats
  initialSessions: Session[]
  initialProgress: Progress[]
  initialCoach: Coach | null
}

export function StudentDashboardClient({ initialStats, initialSessions, initialProgress, initialCoach }: StudentDashboardClientProps) {
  const { totalVideos, pending, watching, watched, implemented, totalSessions, activeSessions } = initialStats
  const sessions = initialSessions
  const progress = initialProgress
  const coach = initialCoach

  const completionRate = totalVideos > 0 ? Math.round(((watched + implemented) / totalVideos) * 100) : 0

  const statCards = [
    { name: 'Wszystkie filmy', value: totalVideos, icon: Video, color: 'bg-blue-500' },
    { name: 'Do oglądania', value: pending, icon: Clock, color: 'bg-yellow-500' },
    { name: 'Oglądam', value: watching, icon: PlayCircle, color: 'bg-blue-500' },
    { name: 'Zakończone', value: watched + implemented, icon: CheckCircle, color: 'bg-green-500' },
  ]

  // Recent progress (last 5)
  const recentProgress = progress.slice(0, 5)

  // Upcoming sessions
  const upcomingSessions = sessions.filter((s) => s.status === 'ACTIVE').slice(0, 3)

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Twój postęp w treningu CS2</p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/student/sessions">
                <BookOpen className="mr-2 h-4 w-4" />
                Wszystkie sesje
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/student/videos">
                <Video className="mr-2 h-4 w-4" />
                Filmy do oglądania
              </Link>
            </Button>
          </div>
        </div>

        {/* Coach Info */}
        {coach && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={coach.avatarUrl || ''} alt={coach.name || ''} />
                  <AvatarFallback className="text-lg">{coach.name?.[0] || 'T'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">Twój trener: {coach.name || coach.email}</p>
                  <p className="text-sm text-muted-foreground">Skontaktuj się w razie pytań</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.name}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={cn('p-3 rounded-xl', stat.color)}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Postęp oglądania filmów</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ogólny postęp</span>
                <span className="text-sm font-bold text-primary">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-3" />
              <div className="grid gap-4 sm:grid-cols-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{pending}</p>
                  <p className="text-xs text-muted-foreground">Do oglądania</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{watching}</p>
                  <p className="text-xs text-muted-foreground">W trakcie</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{watched}</p>
                  <p className="text-xs text-muted-foreground">Obejrzane</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{implemented}</p>
                  <p className="text-xs text-muted-foreground">Wdrożone</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for recent activity */}
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sessions">Nadchodzące sesje</TabsTrigger>
            <TabsTrigger value="progress">Ostatnia aktywność</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            {upcomingSessions.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Brak nadchodzących sesji</p>
                  <p className="text-sm text-muted-foreground mt-1">Twój trener poinformuje Cię o nowej sesji</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <Card key={session.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{session.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {session.scheduledAt ? formatDateTime(session.scheduledAt) : 'Bez terminu'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(STATUS_COLORS[session.status])}>
                            {STATUS_LABELS[session.status]}
                          </Badge>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/student/sessions/${session.id}`}>
                              <ArrowRight className="mr-1 h-4 w-4" />
                              Otwórz
                            </Link>
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {session.tags.slice(0, 3).map((st) => (
                          <Badge key={st.tag.id} variant="secondary" className={cn('text-xs', st.tag.color && `bg-[${st.tag.color}] text-white border-[${st.tag.color}]`)}>
                            {st.tag.name}
                          </Badge>
                        ))}
                        {session.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{session.tags.length - 3}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress">
            {recentProgress.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Brak ostatniej aktywności</p>
                  <p className="text-sm text-muted-foreground mt-1">Rozpocznij oglądanie filmów z sesji</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentProgress.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {p.video.thumbnail ? (
                            <img src={p.video.thumbnail} alt={p.video.title} className="h-12 w-16 rounded object-cover" />
                          ) : (
                            <div className="h-12 w-16 rounded bg-muted flex items-center justify-center">
                              <Video className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-medium truncate">{p.video.title}</h4>
                            <p className="text-sm text-muted-foreground truncate">{p.session.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn(VIDEO_STATUS_COLORS[p.status])}>
                            {VIDEO_STATUS_LABELS[p.status]}
                          </Badge>
                          {p.status !== 'IMPLEMENTED' && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/student/sessions/${p.session.id}`}>
                                Kontynuuj
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                      {p.note && (
                        <p className="mt-2 text-sm text-muted-foreground pl-20 italic">"{p.note}"</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-2">
                <Link href="/student/sessions">
                  <BookOpen className="h-8 w-8" />
                  <span>Moje sesje</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-2">
                <Link href="/student/videos">
                  <Video className="h-8 w-8" />
                  <span>Filmy do oglądania</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-2">
                <Link href="/student/progress">
                  <TrendingUp className="h-8 w-8" />
                  <span>Mój postęp</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-2">
                <Link href="/student/settings">
                  <Target className="h-8 w-8" />
                  <span>Ustawienia</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  )
}