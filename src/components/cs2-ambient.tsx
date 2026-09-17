/**
 * CS2 ambient layer — ciche, tło-owe animacje w klimacie CS2:
 * - unoszące się "embers" (drobinki/iskry),
 * - trace'ujący tracer (kometa) przecinający ekran,
 * - dryfujący crosshair,
 * - powoli dmuchający "smoke" w rogu.
 *
 * Zasady wydajności (jak w całym appce): TYLKO transform + opacity, zero
 * filter/blur (miękkość robi gradient), stała, mała liczba warstw.
 * W jasnym motywie i przy prefers-reduced-motion warstwa jest ukryta.
 * Renderuje się raz — bez stanu, bez JS-owego timera.
 */
export function Cs2Ambient({ variant = 'app' }: { variant?: 'app' | 'auth' }) {
  // Deterministyczny "rozrzucający" pseudo-random (bez Math.random, by SSR i
  // client wygenerowali identyczne pozycje — brak hydration mismatch).
  const rand = (i: number, salt: number) => {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
    return x - Math.floor(x)
  }

  const embers = Array.from({ length: 14 }, (_, i) => ({
    left: 4 + rand(i, 1) * 92, // %
    size: 2 + rand(i, 2) * 3, // px
    duration: 16 + rand(i, 3) * 14, // s
    delay: -rand(i, 4) * 30, // s (ujemny = start w trakcie cyklu)
    drift: (rand(i, 5) - 0.5) * 120, // px
    opacity: 0.35 + rand(i, 6) * 0.4,
  }))

  return (
    <div className="cs2-ambient pointer-events-none fixed inset-0 -z-[6] overflow-hidden" aria-hidden data-variant={variant}>
      {/* Dym — dwie miękkie kule w rogu, oddychają bardzo wolno (na auth mocniej) */}
      <div className="cs2-smoke cs2-smoke-a" style={variant === 'auth' ? { opacity: 1.4 } : undefined} />
      <div className="cs2-smoke cs2-smoke-b" style={variant === 'auth' ? { opacity: 1.4 } : undefined} />

      {/* Crosshair — dryfuje po ekranie jak nick na demo */}
      <div className="cs2-crosshair" />
      <div className="cs2-crosshair-b" />

      {/* Radar — minimapowy sweep z pingami w rogu */}
      <div className="cs2-radar">
        <div className="cs2-radar-sweep" />
        <div className="cs2-radar-ping" />
        <div className="cs2-radar-ping cs2-radar-ping-b" />
      </div>

      {/* Scanline — pas światła przejeżdżający w dół ekranu */}
      <div className="cs2-scanline" />

      {/* Znaczniki bomb-site'ów A/B — dryfujące w tle */}
      <div className="cs2-site cs2-site-a">A</div>
      <div className="cs2-site cs2-site-b">B</div>

      {/* Tracer — smuga przecinająca ekran co ~14s */}
      <div className="cs2-tracer cs2-tracer-a" />
      <div className="cs2-tracer cs2-tracer-b" />

      {/* Embers — drobinki unoszące się z dołu */}
      {embers.map((e, i) => (
        <span
          key={i}
          className="cs2-ember"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            opacity: e.opacity,
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
            ['--drift' as string]: `${e.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
