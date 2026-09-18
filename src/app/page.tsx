import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminRole } from '@/lib/roles'
import { getStarterRoutine } from '@/lib/starter-routine'
import {
  Crosshair, PlayCircle, FileText, ListChecks, Timer, Target, Repeat, ShieldCheck,
  ArrowRight, CheckCircle2, CircleAlert, KeyRound, ChevronDown, Swords, Infinity as InfinityIcon,
} from 'lucide-react'

export const metadata = {
  title: 'Rutyna CS2 — plan treningowy z filmem i opisem do każdego ćwiczenia',
  description:
    'Jedna rutyna treningowa do Counter-Strike 2: dokładny plan na każdy dzień, każde ćwiczenie omówione filmem i tekstem. Wiesz co robić, jak długo i jak sprawdzić progres. Dostęp jednorazowo — kod aktywujesz w 30 sekund.',
  keywords: ['rutyna CS2', 'aim routine', 'trening CS2', 'plan treningowy CS2', 'Faceit Elo', 'poprawa aimu'],
  openGraph: {
    title: 'Rutyna CS2 — film + tekst do każdego ćwiczenia',
    description: 'Konkretny plan treningowy do CS2. Każde ćwiczenie omówione filmem i tekstem. Jednorazowy dostęp, bez abonamentu.',
    type: 'website',
    locale: 'pl_PL',
  },
}

// Cena i link zakupu idą ze środowiska — bez zmian w kodzie przy zmianie oferty.
const BUY_URL = process.env.PRODUCT_BUY_URL || ''
const PRICE_PLN = process.env.PRODUCT_PRICE_PLN || '97'

function BuyCta({ className = '' }: { className?: string }) {
  // Priorytet: Stripe Checkout (płatność + automatyczny mail z kodem).
  // Fallback: zewnętrzny link sprzedaży. Ostatecznie: kontakt mailowy.
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    return (
      <a
        href="/api/checkout/create"
        className={`group inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-white btn-darey ${className}`}
      >
        Kup dostęp — {PRICE_PLN} zł
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </a>
    )
  }
  if (BUY_URL) {
    return (
      <a
        href={BUY_URL}
        className={`group inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-white btn-darey ${className}`}
      >
        Kup dostęp — {PRICE_PLN} zł
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </a>
    )
  }
  // Bez skonfigurowanej sprzedaży: kontakt (nie blokuje strony).
  return (
    <a
      href="mailto:kontakt@example.com?subject=Rutyna%20CS2%20—%20zakup"
      className={`group inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-white btn-darey ${className}`}
    >
      Napisz po dostęp
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </a>
  )
}

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session?.user) {
    const role = (session.user as any).role
    // Zalogowani trafiają prosto do produktu. Admin (właściciel) zostaje na
    // landing — to on zarządza treścią i sprzedażą.
    if (role === 'COACH') redirect('/coach/dashboard')
    if (role === 'STUDENT') redirect('/student/dashboard')
  }

  // Realne liczby do sekcji "co dostajesz" — z biblioteki rutyn, nie z powietrza.
  const beginner = getStarterRoutine('BEGINNER')
  const starterDays = beginner.tasks.length
  const starterMinutes = beginner.totalMinutes

  return (
    <main className="relative min-h-screen overflow-x-clip font-sans text-white bg-[#07060c]">
      {/* ===== NAV ===== */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#07060c]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] shadow-[0_8px_24px_-8px_rgba(139,92,246,0.55)]">
              <Crosshair className="h-5 w-5 text-white" strokeWidth={2.2} />
            </span>
            <span className="font-display text-sm font-bold tracking-tight">Rutyna CS2</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/aktywuj-kod/enter"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white/65 transition hover:text-white hover:bg-white/[0.05]"
            >
              <KeyRound className="h-3.5 w-3.5" /> Aktywuj kod
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-xl px-4 py-2 text-sm font-medium text-white/65 transition hover:text-white hover:bg-white/[0.05]"
            >
              Zaloguj się
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-36 pb-20 sm:pt-44">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
            style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(139,92,246,0.5), transparent 75%)' }} />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 glass text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
            <span className="live-dot" />
            Plan treningowy do Counter-Strike 2
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Rutyna CS2, w której{' '}
            <span className="text-gradient-vantor">każde ćwiczenie</span> omawiam{' '}
            <span className="text-gradient-vantor">filmem i tekstem</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/50">
            Otwierasz plan na dziś: co robić, jak długo, dlaczego i jak sprawdzić, że działa.
            Każde ćwiczenie ma film i dokładny opis — bez zgadywania, bez zbierania poradników z YouTube.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BuyCta />
            <Link
              href="#w-srodku"
              className="inline-flex h-13 w-full items-center justify-center rounded-2xl px-8 py-3.5 text-base font-medium text-white/70 glass transition hover:text-white sm:w-auto"
            >
              Zobacz, co jest w środku
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/35">
            Płacisz raz · dostęp bez limitu czasu · kod aktywujesz w 30 sekund
          </p>

          {/* Hero stats */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: ListChecks, v: 'Każde ćwiczenie', l: 'film + tekst' },
              { icon: Timer, v: 'Plan na każdy dzień', l: 'czas + cel + metryka' },
              { icon: InfinityIcon, v: 'Bez abonamentu', l: 'płacisz raz' },
              { icon: ShieldCheck, v: 'Tracking w panelu', l: 'postęp widoczny' },
            ].map((s) => (
              <div key={s.l} className="glass-liquid rounded-2xl p-4 text-left">
                <s.icon className="mb-2 h-5 w-5 text-[#a78bfa]" />
                <p className="font-display text-sm font-bold">{s.v}</p>
                <p className="mt-0.5 text-[11px] text-white/40">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PROBLEM ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Znane brzmienia?</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Nie utykasz przez brak talentu. Utykasz, bo nie masz planu.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: CircleAlert,
                title: '„Wiem, CO robić — nie robię tego regularnie"',
                body: 'Aim Botz, Recoil Master, DM… znasz je wszystkie. Ale bez konkretnego planu na dziś nic z tego nie wychodzi w regularny trening — i Elo stoi.',
              },
              {
                icon: Crosshair,
                title: '„Oglądam poradniki i nic się nie zmienia"',
                body: 'Poradnik mówi „rób aim trening", ale nie mówi: dziś, tyle minut, w tym tempie, z tą metryką. Wiedza bez struktury nie składa się w progres.',
              },
              {
                icon: Repeat,
                title: '„Zaczynam rutynę, odpuszczam w tydzień"',
                body: 'PDF-y i listy ćwiczeń umierają, bo nie mówią Ci, co zrobić JUTRO i po co. Rutyna, która działa, prowadzi Cię dzień po dniu — i pokazuje postęp.',
              },
            ].map((p) => (
              <div key={p.title} className="glass-liquid rounded-3xl p-6">
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
                  <p.icon className="h-5 w-5 text-red-300" />
                </span>
                <h3 className="font-display text-lg font-bold leading-snug">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CO JEST W ŚRODKU — film + tekst (główna różnica vs PDF) ===== */}
      <section className="relative py-20" id="w-srodku">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Co jest w środku</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Każde ćwiczenie omówione dwukrotnie: filmem i tekstem
            </h2>
            <p className="mt-4 text-white/50">
              Nie dostajesz listy „20 minut Aim Botz”. Dostajesz instrukcję: cel ćwiczenia, technika krok po kroku,
              błędy, które popełnia 90% graczy, i metrykę, którą sprawdzasz po treningu.
            </p>
          </div>

          {/* Mockup karty ćwiczenia — pokazuje format produktu */}
          <div className="mx-auto max-w-3xl">
            <div className="glass-liquid relative overflow-hidden rounded-[28px] border border-white/[0.07] p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row">
                {/* Film */}
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1e1b4b] to-[#134e4a] sm:w-72">
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-white/10 ring-1 ring-white/25 backdrop-blur">
                      <PlayCircle className="h-7 w-7 text-white" />
                    </span>
                  </div>
                  <span className="absolute left-3 top-3 rounded-md bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white/80 backdrop-blur">Film</span>
                </div>
                {/* Tekst */}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c4b5fd]">Dzień 1 · 15 min</p>
                  <h3 className="mt-1 font-display text-lg font-bold">Aim Botz — 100 killi bez pośpiechu</h3>
                  <div className="mt-3 space-y-2 text-sm leading-relaxed text-white/55">
                    <p><strong className="text-white/80">Cel:</strong> celownik zawsze na wysokości głowy.</p>
                    <p><strong className="text-white/80">Jak robić:</strong> stań w jednym miejscu, celuj w głowę, dopiero potem strzał. Po każdej śmierci „wirtualnej” — 2 sekundy przerwy.</p>
                    <p><strong className="text-white/80">Metryka sukcesu:</strong> zapisz, ile z 100 killi było w głowę. Jutro spróbuj zrobić lepiej.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Target, t: 'Cel ćwiczenia', d: 'Po co to robisz i jaki problem naprawia — zanim odpalisz grę.' },
              { icon: PlayCircle, t: 'Film z omówieniem', d: 'Widzisz technikę na żywo: tempo, pozycję celownika, timing.' },
              { icon: FileText, t: 'Tekst krok po kroku', d: 'Checklista do wrócenia w dowolnym momencie — bez przewijania wideo.' },
              { icon: CheckCircle2, t: 'Metryka sukcesu', d: 'Konkretna liczba do sprawdzenia po treningu. Wiesz, że działa.' },
            ].map((f) => (
              <div key={f.t} className="glass-liquid rounded-3xl p-6">
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa]/20 to-[#8b5cf6]/10 ring-1 ring-[#a78bfa]/25">
                  <f.icon className="h-5 w-5 text-[#c4b5fd]" />
                </span>
                <h3 className="font-display text-base font-bold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== JAK TO WYGLĄDA W PRAKTYCE — pętla dzienna ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Jak to działa</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Otwierasz panel. Widzisz dzisiejsze ćwiczenia. Klikasz Start.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: ListChecks, step: '1. Plan na dziś', body: `Rutyna rozbita na dni i ćwiczenia z czasem. Żadnego „co dziś trenować?" — decyzja jest już podjęta.` },
              { icon: PlayCircle, step: '2. Oglądasz film', body: 'Krótkie omówienie techniki do ćwiczenia. Patrzysz raz — potem wracasz tylko do checklisty.' },
              { icon: CheckCircle2, step: '3. Robisz i odhaczasz', body: `Trenujesz z timerem, odhaczasz ćwiczenie. Każdy dzień zostaje w kalendarzu — nawet z jednym ćwiczeniem.` },
              { icon: Swords, step: '4. Sprawdzasz progres', body: 'Kalendarz regularności, minuty treningu i seria dni. Progres widoczny w liczbach, nie w wrażeniach.' },
            ].map((s) => (
              <div key={s.step} className="glass-liquid relative rounded-3xl p-6">
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa]/20 to-[#8b5cf6]/10 ring-1 ring-[#a78bfa]/25">
                  <s.icon className="h-5 w-5 text-[#c4b5fd]" />
                </span>
                <h3 className="font-display text-base font-bold">{s.step}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DLA KOGO ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="glass-liquid rounded-[28px] p-8 sm:p-10">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Dla kogo to jest</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Dla Ciebie, jeśli…
                </p>
                <ul className="space-y-3 text-sm text-white/55">
                  <li className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" /> grasz regularnie, ale Elo stoi od miesięcy</li>
                  <li className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" /> masz 30–60 minut dziennie i chcesz je zamienić w progres</li>
                  <li className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" /> wolisz gotowy plan niż składanie własnego z poradników</li>
                  <li className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" /> chcesz widzieć każdy ćwiczony element na filmie, a nie tylko w opisie</li>
                </ul>
              </div>
              <div>
                <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-red-300">
                  <CircleAlert className="h-4 w-4" /> Nie dla Ciebie, jeśli…
                </p>
                <ul className="space-y-3 text-sm text-white/55">
                  <li className="flex gap-2.5"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400/60" /> szukasz magicznego tricku na Level 10 bez pracy</li>
                  <li className="flex gap-2.5"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400/60" /> grasz „od święta” i nie planujesz wracać regularnie</li>
                  <li className="flex gap-2.5"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400/60" /> chcesz treningu z indywidualnym analizowaniem Twoich meczów — to robimy w coachingu 1:1</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CO DOSTAJESZ + BONUS ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="glass-card border-glow rounded-[28px] p-8 sm:p-10">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Co dokładnie dostajesz</h2>
            <ul className="mt-8 space-y-4">
              {[
                { t: 'Pełna rutyna CS2 w panelu', d: 'Wszystkie dni i ćwiczenia z czasem, celem i metryką sukcesu — na dożywotni dostęp, bez abonamentu.' },
                { t: 'Film do każdego ćwiczenia', d: 'Technika omówiona na żywo: tempo, ustawienie celownika, typowe błędy.' },
                { t: 'Tekst krok po kroku do każdego ćwiczenia', d: 'Checklisty do wrócenia przed każdym treningiem.' },
                { t: 'Timer i tracking w panelu', d: 'Wbudowany timer, kalendarz regularności, seria dni i statystyki praktyki.' },
                { t: `Bonus: rutyna startowa (${starterDays} dni)`, d: `Jeśli chcesz zacząć od fundamentu — osobny darmowy plan (${starterMinutes} min łącznie) dostajesz w panelu od razu po aktywacji konta.` },
              ].map((i) => (
                <li key={i.t} className="flex gap-3.5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400/80" />
                  <div>
                    <p className="font-semibold text-white/90">{i.t}</p>
                    <p className="mt-0.5 text-sm text-white/50">{i.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== FAQ — obiekcje zakupowe ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Pytania, które i tak sobie zadajesz</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">FAQ</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: '„Mogę znaleźć to wszystko za darmo na YouTube. Po co mi to?"',
                a: 'Wiedza jest darmowa — struktura nie. YouTube daje tysiące poradników, ale nie mówi Ci: dziś robisz TO, tyle minut, w tym tempie, i sprawdzasz TĄ metryką. Rutyna składa wiedzę w codzienny plan i pilnuje regularności. To różnica między „wiem jak" a „robię".',
              },
              {
                q: '„Jak długo mam dostęp?"',
                a: 'Na zawsze. Jednorazowa płatność, bez abonamentu, bez limitu czasu. Rutyna zostaje w Twoim panelu razem z timerem, kalendarzem i statystykami.',
              },
              {
                q: '„Ile czasu muszę trenować dziennie?"',
                a: 'Ćwiczenia mają po 10–45 minut, a plan dnia układa się pod 30–60 minut. Codzienna regularność bije jeden długi trening w tygodniu — dlatego cała rutyna jest zbudowana wokół dnia, nie weekendu.',
              },
              {
                q: '„Jaki poziom muszę mieć?"',
                a: 'Rutyna prowadzi Cię od fundamentów (celownik, kontrola sprayu, movement) po zastosowanie w meczach. Jeśli dopiero zaczynasz, w panelu dostaniesz dodatkowo darmową rutynę startową na pierwsze dni.',
              },
              {
                q: '„Jak aktywuję dostęp po zakupie?"',
                a: 'Po zapłacie dostajesz kod dostępu mailem. Zakładasz konto (30 sekund), wpisujesz kod na stronie /aktywuj-kod — i rutyna pojawia się w Twoim panelu. Całość to 2 minuty.',
              },
              {
                q: '„Czy zobaczę progres i po jakim czasie?"',
                a: 'Progres widzisz w trzech warstwach: seria dni (regularność), minuty i ukończone ćwiczenia (pracowitość) oraz metryki sukcesu z ćwiczeń (precyzja). Zmiany w precyzji widać zwykle po 2–3 tygodniach codziennej pracy, w Elo po 1–2 miesiącach.',
              },
              {
                q: '„A jeśli mi nie zadziała?"',
                a: 'Rutyna działa wtedy, gdy ją robisz — dlatego jest zbudowana z krótkich ćwiczeń z jasną metryką, a panel pokazuje Ci serię dni. Jeśli technicznie coś nie działa albo kod nie aktywuje się poprawnie, napisz — rozwiązujemy sprawę.',
              },
            ].map((f) => (
              <details key={f.q} className="group glass-liquid rounded-2xl">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-display text-[15px] font-semibold text-white/90 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/30 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-6 text-sm leading-relaxed text-white/55">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="glass-card border-glow rounded-[32px] p-10 sm:p-14">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Za miesiąc możesz mieć <span className="text-gradient-vantor">30 dni planu za sobą</span>.<br />
              Albo te same 30 dni mielenia.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/50">
              Oba upłyną tak samo szybko. Jeden z nich zostawia ślad w kalendarzu, metrykach i na wykresie.
            </p>
            <div className="mt-9">
              <BuyCta />
            </div>
            <p className="mt-5 text-xs text-white/35">
              Płacisz raz · kod aktywujesz w 30 sekund · dołączasz do graczy, którzy przestali zgadywać
            </p>
          </div>
          <p className="mt-8 text-xs text-white/30">© {new Date().getFullYear()} Rutyna CS2</p>
        </div>
      </section>
    </main>
  )
}
