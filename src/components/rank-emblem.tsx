'use client'

import type { Rank } from '@/lib/gamification'

// CS2-style rank emblem: shield silhouette, 1-3 stars per tier, colored by rank.
export function RankEmblem({ rank, size = 64, glow = true }: { rank: Rank; size?: number; glow?: boolean }) {
  const stars = (rank.tier % 3) + 1
  const starY = rank.tier >= 3 ? 30 : 34 // higher tiers -> stars sit higher (like CS2)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ filter: glow ? `drop-shadow(0 6px 14px ${rank.glow})` : undefined }}
      aria-label={`Ranga: ${rank.name}`}
    >
      <defs>
        <linearGradient id={`rankgrad-${rank.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path
        d="M50 4 L88 16 V48 C88 74 72 90 50 96 C28 90 12 74 12 48 V16 Z"
        fill={rank.color}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
      />
      <path
        d="M50 10 L82 20 V48 C82 70 68 84 50 90 C32 84 18 70 18 48 V20 Z"
        fill={`url(#rankgrad-${rank.key})`}
        opacity="0.7"
      />
      {/* Chevron underline */}
      <path
        d="M35 56 L50 70 L65 56"
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stars */}
      {[0, 1, 2].map((i) =>
        i < stars ? (
          <path
            key={i}
            d="M0 -8 L2.6 -2.6 L8 -1.7 L4 2.5 L5 8 L0 5.2 L-5 8 L-4 2.5 L-8 -1.7 L-2.6 -2.6 Z"
            transform={`translate(${50 + (i - (stars - 1) / 2) * 26} ${starY})`}
            fill="#fff"
            opacity="0.95"
          />
        ) : null,
      )}
    </svg>
  )
}
