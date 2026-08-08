'use client'

import { useMemo } from 'react'
import { formatDate, formatDateTime, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn } from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Video, TrendingUp, Target, Calendar, CheckCircle, Clock, PlayCircle, Trophy, BarChart2, Award } from 'lucide-react'

interface Progress {
  id: string
  status: string
  progress: number
  note: string | null
  watchedAt: string | null
  video: { id: string; title: string; tags: { tag: { id: string; name: string; color: string } }[] }
  session: { id: string; title: string; scheduledAt: string | null }
}

interface Session {
  id: string
  title: string
  status: string
  scheduledAt: string | null
  createdAt: string
}

interface Tag {
  id: string
  name: string
  color: string
  icon: string | null
}

interface StudentProgressClientProps {
  initialProgress: Progress[]
  initialSessions: Session[]
  initialTags: Tag[]
}

export function StudentProgressClient({ initialProgress, initialSessions, initialTags }: StudentProgressClientProps) {
  const progress = initialProgress
  const sessions = initialSessions
  const tags = initialTags

  // Overall stats
  const stats = useMemo(() => ({
    total: progress.length,
    pending: progress.filter((p) => p.status === 'PENDING').length,
    watching: progress.filter((p) => p.status === 'WATCHING').length,
    watched: progress.filter((p) => p.status === 'WATCHED').length,
    implemented: progress.filter((p) => p.status === 'IMPLEMENTED').length,
    totalSessions: sessions.length,
    completedSessions: sessions.filter((s) => s.status === 'COMPLETED').length,
  }), [progress, sessions])

  const completionRate = stats.total > 0 ? Math.round(((stats.watched + stats.implemented) / stats.total) * 100) : 0

  // Tag progress
  const tagProgress = useMemo(() => {
    const map: Record<string, { total: number; completed: number; watching: number }> = {}
    
    progress.forEach((p) => {
      p.video.tags.forEach((vt) => {
        const tagId = vt.tag.id
        if (!map[tagId]) map[tagId] = { total: 0, completed: 0, watching: 0 }
        map[tagId].total++
        if (p.status === 'WATCHED' || p.status === 'IMPLEMENTED') map[tagId].completed++
        if (p.status === 'WATCHING') map[tagId].watching++
      })
    })

    return Object.entries(map).map(([tagId, data]) => {
      const tag = tags.find((t) => t.id === tagId)
      return {
        tag,
        ...data,
        rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      }
    }).sort((a, b) => b.rate - a.rate)
  }, [progress, tags])

  // Weekly activity (last 8 weeks)
  const weeklyActivity = useMemo(() => {
    const weeks: Record<string, { watched: number; implemented: number }> = {}
    const now = new Date()
    
    for (let i = 7; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i * 7)
      const weekKey = `${date.getFullYear()}-W${String(Math.ceil(date.getDate() / 7)).padStart(2, '0')}`
      weeks[weekKey] = { watched: 0, implemented: 0 }
    }

    progress
      .filter((p) => p.watchedAt && (p.status === 'WATCHED' || p.status === 'IMPLEMENTED'))
      .forEach((p) => {
        const date = new Date(p.watchedAt!)
        const weekKey = `${date.getFullYear()}-W${String(Math.ceil(date.getDate() / 7)).padStart(2, '0')}`
        if (weeks[weekKey]) {
          if (p.status === 'IMPLEMENTED') weeks[weekKey].implemented++
          else weeks[weekKey].watched++
        }
      })

    return Object.entries(weeks).map(([week, data]) => ({ week, ...data }))
  }, [progress])

  // Recent activity
  const recentActivity = progress.slice(0, 10)

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mój postęp</h1>
          <p className="text-muted-foreground mt-1">Przegląd Twoich osiągnięć i obszarów do poprawy</p>
        </div>

        {/* Overall Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Wszystkie filmy</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Zakończone</p>
                  <p className="text-3xl font-bold text-green-600">{stats.watched + stats.implemented}</p>
                </div>
                <Badge variant="secondary" className="text-green-600 bg-green-100 border-green-200">
                  {completionRate}%
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Wdrożone</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.implemented}</p>
                </div>
                <Trophy className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sesje</p>
                  <p className="text-3xl font-bold">{stats.totalSessions}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Zakończone sesje</p>
                  <p className="text-3xl font-bold">{stats.completedSessions}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Postęp oglądania</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ogólny postęp</span>
              <span className="text-sm font-bold text-primary">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            <div className="grid gap-4 sm:grid-cols-4 text-center">
              <div className="p-3 rounded-lg bg-yellow-50">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Do oglądania</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <p className="text-2xl font-bold text-blue-600">{stats.watching}</p>
                <p className="text-xs text-muted-foreground">W trakcie</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <p className="text-2xl font-bold text-green-600">{stats.watched}</p>
                <p className="text-xs text-muted-foreground">Obejrzane</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <p className="text-2xl font-bold text-purple-600">{stats.implemented}</p>
                <p className="text-xs text-muted-foreground">Wdrożone</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="tags" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tags">Tagi błędów</TabsTrigger>
            <TabsTrigger value="activity">Aktywność tygodniowa</TabsTrigger>
            <TabsTrigger value="recent">Ostatnia aktywność</TabsTrigger>
          </TabsList>

          {/* Tags Progress */}
          <TabsContent value="tags" className="space-y-4">
            {tagProgress.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Brak danych o tagach</p>
                  <p className="text-sm text-muted-foreground mt-1">Oglądaj filmy, by zobaczyć postęp po tagach</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tagProgress.map((item) => (
                  <Card key={item.tag?.id || item.tag?.name}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.tag && (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                              style={{ backgroundColor: item.tag.color }}
                            >
                              {item.tag.icon ? <span className="text-lg">{item.tag.icon}</span> : <Target className="h-5 w-5" />}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.tag?.name || 'Nieznany tag'}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{item.completed}/{item.total} zakończonych</span>
                              {item.watching > 0 && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  {item.watching} w trakcie
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className={cn(item.tag?.color && `bg-[${item.tag.color}] text-white border-[${item.tag.color}]`)}>
                            {item.rate}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={item.rate} className="h-2 mt-3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Weekly Activity */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Aktywność ostatnich 8 tygodni</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeklyActivity.map((week) => (
                    <div key={week.week} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-muted-foreground">{week.week}</div>
                      <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden relative">
                        {week.watched > 0 && (
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${(week.watched / Math.max(week.watched + week.implemented, 1)) * 100}%` }}
                          />
                        )}
                        {week.implemented > 0 && (
                          <div
                            className="absolute top-0 right-0 h-full bg-purple-500 transition-all"
                            style={{ width: `${(week.implemented / Math.max(week.watched + week.implemented, 1)) * 100}%` }}
                          />
                        )}
                      </div>
                      <div className="w-32 text-right text-sm">
                        <span className="text-green-600">{week.watched} obejrz.</span>
                        {week.implemented > 0 && <span className="ml-2 text-purple-600">{week.implemented} wdr.</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Obejrzane</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-purple-500" />
                    <span>Wdrożone</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Activity */}
          <TabsContent value="recent" className="space-y-4">
            {recentActivity.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Brak ostatniej aktywności</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-16 rounded bg-muted flex items-center justify-center">
                            <Video className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium truncate">{p.video.title}</h4>
                            <p className="text-sm text-muted-foreground truncate">{p.session.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn(VIDEO_STATUS_COLORS[p.status])}>
                            {VIDEO_STATUS_LABELS[p.status]}
                          </Badge>
                          {p.watchedAt && (
                            <span className="text-xs text-muted-foreground">{formatDateTime(p.watchedAt)}</span>
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
      </div>
    </StudentLayout>
  )
}