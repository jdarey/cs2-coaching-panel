'use client'

import { formatDate, formatDateTime, getInitials, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Plus, Users, BookOpen, Video, Tag, TrendingUp, ArrowRight, Clock, UserCheck } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  studentsCount: number
  sessionsCount: number
  videosCount: number
  tagsCount: number
  recentSessions: any[]
  recentStudents: any[]
}

interface CoachDashboardClientProps {
  initialStats: Stats
}

export function CoachDashboardClient({ initialStats }: CoachDashboardClientProps) {
  const { studentsCount, sessionsCount, videosCount, tagsCount, recentSessions, recentStudents } = initialStats

  const statCards = [
    { name: 'Uczniowie', value: studentsCount, icon: Users, color: 'bg-blue-500', href: '/coach/students' },
    { name: 'Sesje', value: sessionsCount, icon: BookOpen, color: 'bg-green-500', href: '/coach/sessions' },
    { name: 'Filmy', value: videosCount, icon: Video, color: 'bg-purple-500', href: '/coach/videos' },
    { name: 'Tagi', value: tagsCount, icon: Tag, color: 'bg-orange-500', href: '/coach/tags' },
  ]

  return (
    <CoachLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Przegląd Twojego panelu trenera</p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/coach/sessions/new">
                <Plus className="mr-2 h-4 w-4" />
                Nowa sesja
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/coach/videos/new">
                <Plus className="mr-2 h-4 w-4" />
                Dodaj film
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Link key={stat.name} href={stat.href} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
            </Link>
          ))}
        </div>

        {/* Recent Sessions & Students */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ostatnie sesje</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/coach/sessions">
                  Wszystkie <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentSessions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Brak sesji. Utwórz swoją pierwszą sesję!</p>
                  <Button asChild className="mt-4">
                    <Link href="/coach/sessions/new">Utwórz sesję</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={session.student.avatarUrl || ''} alt={session.student.name || ''} />
                            <AvatarFallback>{getInitials(session.student.name || 'U')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{session.title}</p>
                            <p className="text-sm text-muted-foreground">{session.student.name || session.student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={STATUS_COLORS[session.status]}>
                            {STATUS_LABELS[session.status]}
                          </Badge>
                          <span className="text-sm text-muted-foreground hidden sm:block">
                            {session.scheduledAt ? formatDateTime(session.scheduledAt) : formatDate(session.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          {session._count.videos} filmów
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {session._count.tags} tagów
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Students */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Nowi uczniowie</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/coach/students">
                  Wszyscy <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentStudents.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Brak uczniów. Dodaj pierwszego ucznia!</p>
                  <Button asChild className="mt-4">
                    <Link href="/coach/students">Dodaj ucznia</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {recentStudents.map((student) => (
                    <div key={student.id} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.avatarUrl || ''} alt={student.name || ''} />
                          <AvatarFallback className="text-base">{getInitials(student.name || 'U')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{student.name || student.email}</p>
                          <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{student._count.videoProgress} filmów</p>
                          <p className="text-xs text-muted-foreground">{formatDate(student.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-2">
                <Link href="/coach/sessions/new">
                  <Plus className="h-8 w-8" />
                  <span>Nowa sesja</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-2">
                <Link href="/coach/videos/new">
                  <Video className="h-8 w-8" />
                  <span>Dodaj film</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-2">
                <Link href="/coach/tags/new">
                  <Tag className="h-8 w-8" />
                  <span>Dodaj tag</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-center gap-2">
                <Link href="/coach/students/new">
                  <UserCheck className="h-8 w-8" />
                  <span>Dodaj ucznia</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </CoachLayout>
  )
}

import { cn } from '@/lib/utils'