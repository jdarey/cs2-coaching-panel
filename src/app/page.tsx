import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminRole, isCoachRole } from '@/lib/roles'
import { LandingLiveStats } from '@/components/landing-live-stats'
import {
  Crosshair, Flame, CalendarDays, TrendingUp, ListChecks, Target, Timer,
  CheckCircle2, ArrowRight, GraduationCap, CircleAlert, Repeat, ShieldCheck,
  MessageSquareHeart, Swords, ChevronDown, ChevronRight, Eye, Users, Zap,
} from 'lucide-react'

export const metadata = {
  title: 'CS2 Coaching — codzienny system treningowy, który wynosi Cię z stagnacji',
  description:
    'Konkretny plan na każdy dzień: co robić, jak długo, dlaczego i jak mierzyć progres. Rutyny treningowe, tracking ELO, kalendarz regularności i trener, który widzi Twoje dane. Przestań mielić mecze bez planu.',
  keywords: ['CS2 coaching', 'trening CS2', 'rutyna treningowa CS2', 'Faceit Elo', 'aim training', 'polepszenie aimu', 'coach CS2 PL'],
  openGraph: {
    title: 'CS2 Coaching — codzienny system treningowy',
    description: 'Co robić → jak długo → dlaczego → jak mierzyć progres. System treningowy CS2 z trenerem i trackingiem.',
    type: 'website',
    locale: 'pl_PL',
  },
}

/**
 * Landing page — widoczna TYLKO dla niezalogowanych (zalogowani lecą od razu
 * do swoich paneli). Copy zbudowane na researchu: główny problem graczy to
 * nie brak wiedzy (YouTube jest darmowy), tylko brak SYSTEMU: planu na dziś,
 * regularności i mierzalnego progresu. Każda sekcja odpowiada na jedną
 * obiekcję lub problem z researchu.
 */
export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session?.user) {
    const role = (session.user as any).role
    if (isAdminRole(role)) redirect('/admin')
    if (isCoachRole(role)) redirect('/coach/dashboard')
    redirect('/student/dashboard')
  }

  return (
    <main className="relative min-h-screen overflow-x-clip font-sans text-white bg-[#07060c]">
      {/* ===== NAV ===== */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#07060c]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] shadow-[0_8px_24px_-8px_rgba(139,92,246,0.55)]">
              <GraduationCap className="h-5 w-5 text-white" strokeWidth={2.2} />
            </span>
            <span className="font-display text-sm font-bold tracking-tight">CS2 Coaching</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-white/65 transition hover:text-white hover:bg-white/[0.05]"
            >
              Zaloguj się
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.6)] transition hover:scale-[1.02]"
            >
              Zacznij teraz
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-36 pb-24 sm:pt-44">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
            style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(139,92,246,0.5), transparent 75%)' }} />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 glass text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
            <span className="live-dot" />
            System treningowy dla graczy CS2
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Rangi nie wchodzą od{' '}
            <span className="text-gradient-vantor">ogladania poradników</span>.
            Wchodzą od <span className="text-gradient-vantor">codziennej pracy z planem</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/50">
            Nie obiecujemy Ci Level 10 w tydzień. Dajemy Ci coś, czego nie ma na YouTube:
            konkretny plan na dziś, kontrole regularności i trenera, który widzi Twoje dane.
            Ty tylko klikasz Start.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-base font-semibold text-white btn-darey sm:w-auto"
            >
              Załóż konto za darmo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-13 w-full items-center justify-center rounded-2xl px-8 py-3.5 text-base font-medium text-white/70 glass transition hover:text-white sm:w-auto"
            >
              Mam już konto
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/35">
            Konto ucznia bez karty · dołączasz do trenera kodem zaproszenia
          </p>

          {/* Hero stats — odpowiedź na "czym to się różni od PDF-a z rutyną" */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: CalendarDays, v: 'Codziennie', l: 'gotowy plan na dziś' },
              { icon: Timer, v: '30–60 min', l: 'trenuj, ile realnie masz' },
              { icon: Flame, v: 'Seria dni', l: 'regularność widoczna' },
              { icon: TrendingUp, v: 'ELO + staty', l: 'progres mierzalny' },
            ].map((s) => (
              <div key={s.l} className="glass-liquid rounded-2xl p-4 text-left">
                <s.icon className="mb-2 h-5 w-5 text-[#a78bfa]" />
                <p className="font-display text-sm font-bold">{s.v}</p>
                <p className="mt-0.5 text-[11px] text-white/40">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Live stats — realne liczby z platformy albo nic (zero ściemy) */}
          <div className="mt-4">
            <LandingLiveStats />
          </div>
        </div>
      </section>

      {/* ===== PROBLEM — nazwij to, co czci gracza (research: stagnacja, brak planu) ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Znany brzmienia?</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Większość graczy nie utyka przez brak talentu. Utyka przez brak systemu.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: CircleAlert,
                title: '„Wiem, CO robić — nie robię tego regularnie”',
                body: 'Poradników masz setki. Aim Botz, Recoil Master, DM… Wiesz o nich wszystko. Ale bez planu na dziś i bez kontroli serii dzień bez treningu znika bez śladu — i znika Elo.',
              },
              {
                icon: Crosshair,
                title: '„Trenuję dużo, Elo stoi w miejscu”',
                body: 'Godziny w DM bez celu to mielenie, nie trening. Bez pomiaru (reakcja, pre-aim, celność, spray) nie wiesz, czy te 100 meczy coś zmieniło — i co trenować następne.',
              },
              {
                icon: Repeat,
                title: '„Zaczynam rutynę, odpuszczam w tydzień”',
                body: 'PDF-y i „30-dniowe wyzwania” umierają, bo nie widzą Twojego kontekstu: ile masz czasu dzisiaj, gdzie masz dziury i czy w ogóle wróciłeś wczoraj. System musi się dostosować do Ciebie.',
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

      {/* ===== ROZWIĄZANIE — pętla dzienna (USP: system, nie materiał) ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Jak to działa</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Codzienna pętla, która robi za Ciebie myślenie
            </h2>
            <p className="mt-4 text-white/50">
              Wchodzisz na panel — widzisz dokładnie jeden ekran: co dziś zrobić i dlaczego. Reszta dzieje się sama.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                icon: ListChecks,
                step: '1. Plan na dziś',
                body: 'Twoja rutyna rozbita na konkretne ćwiczenia: Aim Botz, rekoił, DM z celem. Każde z czasem, opisem technicznym i materiałem wideo/GIF. Klikasz Start i robisz.',
              },
              {
                icon: CheckCircle2,
                step: '2. Odhaczasz',
                body: 'Zaliczone ćwiczenia zapisują się w kalendarzu — nawet jeśli dziś zrobisz tylko jedno. Nie ma dnia „znikniętego”: kalendarz pamięta każdy wysiłek.',
              },
              {
                icon: Flame,
                step: '3. Budujesz serię',
                body: 'Seria dni rośnie, tydzień po tygodniu. Regularność to jedyna metryka, która naprawdę przewiduje progres — i jest u Ciebie widoczna codziennie.',
              },
              {
                icon: Swords,
                step: '4. Grasz i sprawdzasz',
                body: 'Mecze z Faceita importują się same: Elo, K/D, reakcja, pre-aim, celność. Widzisz trend — a trener widzi to samo i pokazuje, co poprawić.',
              },
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

      {/* ===== FUNKCJE ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">W środku</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Wszystko, czego YouTube Ci nie da</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: CalendarDays, t: 'Kalendarz treningów', d: 'Widzisz ostatnie tygodnie: pełne dni, częściowe dni, notatki i sen. Twoja regularność przestaje być zgadywanką.' },
              { icon: ListChecks, t: 'Rutyny od trenera', d: 'Programy wielodniowe z ćwiczeniami, minutami, filmami i GIF-ami. Przypisane konkretnie pod Twoje dziury — nie generyczny PDF.' },
              { icon: Timer, t: 'Timer praktyki', d: 'Wbudowany timer liczy minuty treningu. Ty.week sumują się w wykres tygodniowy — widzisz, czy trenujesz wystarczająco.' },
              { icon: Swords, t: 'Log meczów z Faceita', d: 'Automatyczny import: wynik, mapa, Elo, reakcja, pre-aim, celność. Po każdym meczu wiesz, co poszło nie tak.' },
              { icon: TrendingUp, t: 'Trajektoria Elo', d: 'Wykres Elo w czasie zamiast „chyba chyba wchodzę”. Realny trend zamiast wrażeń po jednym złym wieczorze.' },
              { icon: Target, t: 'Cele 1–3 i kamienie milowe', d: 'Krótkie, konkretne cele z terminem. Trener widzi postęp i pilnuje, żebyś nie płynął po rozum do kubełka.' },
              { icon: MessageSquareHeart, t: 'Feedback i wiadomości', d: 'Komentarz trenera do sesji, zadań i meczów. Masz odpowiedź „co dalej”, zanim stracisz motywację.' },
              { icon: Flame, t: 'Seria i ranking tygodnia', d: 'Zobacz, kto z Twojej drużyny trenuje najwięcej w tym tygodniu. Zdrowa presja grupy działa lepiej niż norma.' },
              { icon: ShieldCheck, t: 'Zero ściemy', d: 'Dane z Faceita i Twoje odhaczenia — bez sztucznie zawyżanych statystyk. Jeśli nie trenujesz, panel to pokaże.' },
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

      {/* ===== USP — obiekcja nr 1 z researchu: "mam YouTube za darmo".
           3 kolumny = 3 realne różnice systemu vs darmowe materiały. ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Dlaczego nie YouTube?</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Wiedza jest darmowa. Regularność, pomiar i rozliczanie — już nie.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Zap,
                t: 'Zero decyzji, zero zwlekania',
                d: 'Poradnik mówi Ci „rób aim trening”. My mówimy: dziś 12 minut Aim Botz, 8 minut rekoił, 10 minut DM z celem — i timer leci. Decyzja „co dziś trenować” to najtańszy powód, żeby odpuszczać.',
              },
              {
                icon: Eye,
                t: 'Trener, który widzi Twoje dane',
                d: 'Film nie wie, że last 5 dni nie trenowałeś. Trener widzi serię, minuty, staty meczów i reaguje zanim przerwa zrobi się z 2 tygodni. To różnica między „może kiedyś” a „robisz teraz”.',
              },
              {
                icon: Users,
                t: 'Konto ucznia, nie playlista',
                d: 'Każde odhaczone ćwiczenie, każdy mecz i każda sesja zostają w Twoim kalendarzu i na wykresach. Progres, który nie żyje w głowie — żyje w systemie.',
              },
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
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-white/35">
            <ChevronRight className="mr-1 inline h-4 w-4 -translate-y-0.5 text-[#a78bfa]/60" />
            Poradniki dalej będą Cię bawić. Ten system ma Cię wynieść z miejsca, w którym stoisz od miesięcy.
          </p>
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
                  <li className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" /> chcesz konkretnego planu, nie kolejnej porcji poradników</li>
                  <li className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" /> chcesz trenera, który patrzy na Twoje dane, a nie gadą ogólników</li>
                </ul>
              </div>
              <div>
                <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-red-300">
                  <CircleAlert className="h-4 w-4" /> Nie dla Ciebie, jeśli…
                </p>
                <ul className="space-y-3 text-sm text-white/55">
                  <li className="flex gap-2.5"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400/60" /> szukasz magicznego tricku na Level 10 bez pracy</li>
                  <li className="flex gap-2.5"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400/60" /> grasz „od święta” i nie planujesz wracać regularnie</li>
                  <li className="flex gap-2.5"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400/60" /> wolisz kupować skiny niż trenować — też spoko, ale tu bez nas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ — odpowiedzi na realne obiekcje zakupowe z researchu ===== */}
      <section className="relative py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Pytania, które i tak sobie zadajesz</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">FAQ</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: '„Mogę znaleźć to wszystko za darmo na YouTube. Po co mi to?”',
                a: 'Masz rację — wiedza jest darmowa. My sprzedajemy to, czego YouTube nie ma: system, który sprawia, że tę wiedzę realnie stosujesz codziennie. Plan na dziś, seria, kalendarz, import meczów i trener, który sprawdza, czy robisz co trzeba. To różnica między „wiem jak” a „robię”.',
              },
              {
                q: '„Ile czasu muszę trenować dziennie?”',
                a: 'Minimum 30 minut. Rutyny są budowane z ćwiczeń po 5–20 minut, więc układasz je pod swój dzień. Badania i praktyka pro-sceny zgodnie pokazują: 30 minut codziennie bije 4 godziny raz w tygodniu. Regularność jest tu metryką numer jeden — i jest przez nas mierzona.',
              },
              {
                q: '„Jaki poziom musi mieć gracz, żeby zacząć?”',
                a: 'Dowolny. Rutyny przypisuje trener po rozpoznaniu Twojej gry — od pierwszych kroków w recoil po pracę nad crosshair placement i pre-aim pod Faceita. Nie ma tu „za nisko”: im niżej jesteś, tym więcej single-change daje.',
              },
              {
                q: '„Czy zobaczę progres i po jakim czasie?”',
                a: 'Progres mierzysz trzema warstwami: serią dni (regularność), statystykami praktyki (minuty, ukończone ćwiczenia) i danymi z meczów (Elo, reakcja, pre-aim, celność). Wszystko widzisz w panelu na wykresach. Realnie: zmiany w statystykach treningowych widać po 2–3 tygodniach, w Elo po 1–2 miesiącach konsekwencji.',
              },
              {
                q: '„Czy to nie kolejny PDF / kurs, który odpuszczam po tygodniu?”',
                a: 'Nie, bo to nie jest materiał do przerobienia. To system, który żyje razem z Tobą: kalendarz pamięta każdy dzień (nawet z jednym ćwiczeniem), seria rośnie, trener widzi przerwy i reaguje. Ty możesz odpuszczać — ale panel będzie o tym wiedział, i to zwykle wystarcza.',
              },
              {
                q: '„Ile to kosztuje?”',
                a: 'Konto ucznia zakładasz za darmo — dołączasz do trenera kodem zaproszenia i pracujecie w panelu. Płacisz trenerowi za sesje 1:1 i pracę nad Twoją grą; sam system treningowy dostajesz w pakiecie. Bez abonamentu, bez ukrytych opłat.',
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
              Za miesiąc będziesz mieć <span className="text-gradient-vantor">30 dni serii</span>.<br />
              Albo te same 30 dni mielenia.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/50">
              Oba upłyną tak samo szybko. Jeden z nich zostawia ślad w kalendarzu i na wykresie Elo.
            </p>
            <Link
              href="/register"
              className="group mt-9 inline-flex items-center gap-2 rounded-2xl px-10 py-4 text-base font-semibold text-white btn-darey"
            >
              Załóż konto za darmo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <p className="mt-8 text-xs text-white/30">© {new Date().getFullYear()} CS2 Coaching · Panel ucznia i trenera</p>
        </div>
      </section>
    </main>
  )
}
