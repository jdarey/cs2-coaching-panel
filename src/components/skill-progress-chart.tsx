'use client'

import { cn } from '@/lib/utils'
import { TrendingDown } from 'lucide-react'

export interface SkillSnapshot {
  createdAt: string
  aim: number | null
  positioning: number | null
  utility: number | null
  clutch: number | null
  opening: number | null
}

/** Line chart of Leetify skill ratings over time — does the student improve? */
export function SkillProgressChart({
  snapshots,
}: {
  snapshots: SkillSnapshot[]
}) {
  const DIMS = [
    { key: 'aim', label: 'Aim', color: '#a78bfa' },
    { key: 'positioning', label: 'Pozycje', color: '#34d399' },
    { key: 'utility', label: 'Utility', color: '#fbbf24' },
    { key: 'clutch', label: 'Clutch', color: '#f87171' },
    { key: 'opening', label: 'Otwarcia', color: '#38bdf8' },
  ] as const

  const W = 720
  const H = 220
  const padX = 46
  const padTop = 14
  const padBottom = 30

  // Values are already 0–100 (normalized server-side)
  const series = DIMS.map((d) => ({
    ...d,
    values: snapshots.map((s) => (s[d.key] == null ? null : (s[d.key] as number))),
  }))

  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null))
  const min = all.length === 0 ? 0 : Math.max(0, Math.floor((Math.min(...all) - 10) / 10) * 10)
  const max = all.length === 0 ? 100 : Math.min(100, Math.ceil((Math.max(...all) + 10) / 10) * 10)
  const range = Math.max(1, max - min)

  const x = (i: number) => padX + (i / Math.max(1, snapshots.length - 1)) * (W - padX * 2)
  const y = (v: number) => padTop + (1 - (v - min) / range) * (H - padTop - padBottom)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] ring-1 ring-white/25">
            <TrendingDown className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-white/90">Postęp słabości w czasie</h3>
            <p className="text-[11px] text-white/40">wyniki Leetify z {snapshots.length} próbek — czy rutyny działają?</p>
          </div>
        </div>
        {/* Legend with deltas */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => {
            const nums = s.values.filter((v): v is number => v != null)
            if (nums.length < 2) return null
            const delta = nums[nums.length - 1] - nums[0]
            const up = delta > 0.05
            const down = delta < -0.05
            return (
              <span key={s.key} className="inline-flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                <span className="text-white/60">{s.label}</span>
                <span className={cn('font-bold tabular-nums', up ? 'text-[#34d399]' : down ? 'text-red-300' : 'text-white/40')}>
                  {up ? '▲' : down ? '▼' : '•'} {delta.toFixed(1)}%
                </span>
              </span>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="Wykres postępu umiejętności w czasie">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const v = min + range * t
            return (
              <g key={t}>
                <line x1={padX} x2={W - padX} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <text x={padX - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.3)">
                  {Math.round(v)}%
                </text>
              </g>
            )
          })}

          {/* Per-dimension lines */}
          {series.map((s) => {
            const pts = s.values.map((v, i) => (v == null ? null : { x: x(i), y: y(v) })).filter((p): p is { x: number; y: number } => p != null)
            if (pts.length < 2) return null
            const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
            return (
              <g key={s.key}>
                <polyline
                  points={line}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: `drop-shadow(0 0 4px ${s.color}66)` }}
                />
                {pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3" fill={s.color} />
                ))}
              </g>
            )
          })}

          {/* X labels */}
          {snapshots.map((s, i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.35)">
              {new Date(s.createdAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
