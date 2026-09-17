/**
 * Rutyna startowa "Pierwsze 7 dni" — odpowiedź na lukę nr 1 z researchu:
 * nowy gracz bez trenera dostawał pusty panel (dzień 0 = złamana obietnica
 * "Ty tylko klikasz Start"). Refrag sprzedaje "dostajesz plan od razu" —
 * tutaj plan dostajesz dosłownie jednym klikiem, zanim jakikolwiek trener
 * się zaangażuje.
 *
 * Zasady z researchu:
 * - pierwsze dni = jak najmniej tarcia (dzień 1 to ~15 min),
 * - każdy dzień zawiera JEDNO nowe ćwiczenie z jasnym celem i metryką sukcesu,
 * - dzień 5 i 7 to dni "meczowe" (zastosowanie + dzień kontrolny),
 * - copy ćwiczeń mówi CO / JAK DŁUGO / DLACZEGO / JAK ZMIERZYĆ.
 */

export const STARTER_ROUTINE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const
export type StarterRoutineLevel = (typeof STARTER_ROUTINE_LEVELS)[number]

export interface StarterTaskDef {
  title: string
  description: string
  minutes: number
}

export interface StarterRoutineDef {
  title: string
  description: string
  /** Suma minut wszystkich zadań — wyświetlana przed startem */
  totalMinutes: number
  tasks: StarterTaskDef[]
}

const LEVEL_LABELS: Record<StarterRoutineLevel, string> = {
  BEGINNER: 'Początkujący',
  INTERMEDIATE: 'Średni',
  ADVANCED: 'Zaawansowany',
}

export function levelLabel(level: string | null | undefined): string {
  if (!level) return ''
  return LEVEL_LABELS[level as StarterRoutineLevel] ?? ''
}

const BASE_TASKS: Record<StarterRoutineLevel, StarterTaskDef[]> = {
  BEGINNER: [
    {
      title: 'Aim Botz — 100 killi bez pośpiechu',
      minutes: 15,
      description:
        '### Cel\nPierwszy krok: celownik zawsze na wysokości głowy.\n\n### Jak robić\n- [ ] Stań w jednym miejscu, celuj w głowę, potem strzał\n- [ ] Po każdej śmierci „wirtualnej” — 2 sekundy przerwy\n- [ ] Nie licz killi na czas — licz trafienia w głowę\n\n### Jak mierzyć sukces\nZapisz, ile z 100 killi było w głowę. Jutro spróbuj zrobić lepiej.',
    },
    {
      title: 'Recoil Master — spray AK: pierwsze 10 pocisków',
      minutes: 15,
      description:
        '### Cel\nKontroluj pierwsze 10 pocisków AK-47 — to 90% pojedynków.\n\n### Jak robić\n- [ ] Strafe-stopping: zatrzymaj ruch PRZED strzałem\n- [ ] Ćwicz tylko pierwszy wzór (w górę-lemasz), resztę pomiń\n- [ ] 5 serii po 10 pocisków, potem porównaj ślad na ścianie\n\n### Jak mierzyć sukces\nŚlad pierwszych 10 pocisków ma zmieścić się w „głowie” na ścianie.',
    },
    {
      title: 'Deathmatch — tylko HS, bez licznika fragów',
      minutes: 20,
      description:
        '### Cel\nPrzenieś celowanie z map treningowych na żywych graczy.\n\n### Jak robić\n- [ ] Runda trwa 10 min, ale liczy się cel: tylko strzały w głowę\n- [ ] Zawsze zatrzymaj się przed strzałem (counter-strafe)\n- [ ] Po każdej śmierci zadaj pytanie: „gdzie był mój celownik?”\n\n### Jak mierzyć sukces\nNie licz K/D. Policz, ile razy zabiłeś strzałem w głowę świadomie.',
    },
    {
      title: 'Crosshair placement — 15 min na Dust2 (offline z botami)',
      minutes: 15,
      description:
        '### Cel\nPrzestań karać celownik po skręcie — trzymaj go tam, gdzie głowa wroga MÓGŁBY być.\n\n### Jak robić\n- [ ] Chodź przez middle i long, celownik na wysokości głowy, przy każdym rogu\n- [ ] Boty ustaw na łatwe — chodzi o NAWYK, nie o fragi\n- [ ] 15 minut ciszy: bez muzyki, skupienie na pozycji celownika\n\n### Jak mierzyć sukces\nPo treningu zagraj 1 mecz i policz, ile razy musiałeś „naprawiać” celownik po skręcie.',
    },
    {
      title: 'Movement — counter-strafe i peeking z botami',
      minutes: 15,
      description:
        '### Cel\nWygrywaj pojedynki zanim strzelisz: przez szybsze zatrzymanie się.\n\n### Jak robić\n- [ ] A-D-A-D na sucho: zatrzymanie w 1 klatce, strzał natychmiast\n- [ ] Peek z prawej strony zasłony (szerzej widzisz, trudniej Cię trafić)\n- [ ] Ćwicz 5 minut „jiggle peek” na botach\n\n### Jak mierzyć sukces\nW DM: czy po zatrzymaniu pierwszy pocisk leci prosto?',
    },
    {
      title: 'Mecz — 1 Premier/Comp z jednym celem',
      minutes: 45,
      description:
        '### Cel\nZastosuj 4 dni treningu w prawdziwej grze — z JEDNYM celem, nie pięcioma.\n\n### Jak robić\n- [ ] Jedyne co Cię dziś interesuje: celownik na wysokości głowy przy każdym rogu\n- [ ] Nie patrz na wynik, patrz na swój nawyk\n- [ ] Po meczu: jedna notatka — co poszło lepiej niż zwykle?\n\n### Jak mierzyć sukces\nCzujesz, że „widzisz” głowy zanim się pojawią? To jest sukces dnia.',
    },
    {
      title: 'Dzień kontrolny — 15 min Aim Botz + porównanie z dniem 1',
      minutes: 15,
      description:
        '### Cel\nZobacz swój progres liczbami, nie wrażeniami.\n\n### Jak robić\n- [ ] 100 killi jak w dniu 1, ten sam format\n- [ ] Zapisz % killi w głowę i porównaj z dniem 1\n- [ ] Jeśli liczba poszła w górę — masz pierwszą twardą dowodzoną zmianę\n\n### Jak mierzyć sukces\nWyższy % HS niż w dniu 1. Jeśli nie — nie szkodzi: 7 dni to za mało na rewolucję, ale za dużo na brak trendu.',
    },
  ],
  INTERMEDIATE: [
    {
      title: 'Aim Botz — 200 killi, 60% w głowę',
      minutes: 15,
      description:
        '### Cel\nPrecyzja pod presją tempa: szybciej, ale nie kosztem pierwszego pocisku.\n\n### Jak robić\n- [ ] Tempo: kill co ~4 sekundy, bez „snajperstwa” na jedną głowę\n- [ ] Przeplataj: 50 statycznych, 50 po ruchu A-D, 100 w ruchu\n- [ ] Zapisz % HS z uzi i z AK osobno\n\n### Jak mierzyć sukces\n% HS nie spada poniżej 50 przy wyższym tempie niż wczoraj.',
    },
    {
      title: 'Recoil Master + DM: kontrola sprayu na 15 pocisków',
      minutes: 20,
      description:
        '### Cel\nSpray transfer i dłuższe serie — po to, żeby wygrywać pojedynki 1v2.\n\n### Jak robić\n- [ ] Recoil Master: wzór 15 pocisków AK na ścianie, 10 serii\n- [ ] Potem DM: zabijaj 2 graczy jedną serią, zanim odpuscisz spust\n- [ ] Celownik wraca na głowę PO serii, nie w dół\n\n### Jak mierzyć sukces\nW DM zalicz 3 razy „multikill jedną serią”.',
    },
    {
      title: 'Prefire — trening na mapie (Prefire mapy lub boty)',
      minutes: 15,
      description:
        '### Cel\nStrzelaj ZANIM zobaczysz wroga — tam, gdzie on musi się pojawić.\n\n### Jak robić\n- [ ] Wybierz 2 pozycje na swojej main mapie\n- [ ] Przejdź je 20 razy: pre-aim na kąt, nie reakcja po zobaczeniu\n- [ ] Zwróć uwagę: pre-aim = celownik tam, gdzie głowa będzie, nie gdzie jest\n\n### Jak mierzyć sukces\nW DM/MECZU: pierwsza kula trafia wroga, który dopiero się pokazał.',
    },
    {
      title: 'Movement + utility: flash-assisted peek (20 min)',
      minutes: 20,
      description:
        '### Cel\nWejście z poparciem — jak entry fragger, nie jak samobójca.\n\n### Jak robić\n- [ ] 2 flashe na swoją main pozycję wejścia (np. long A)\n- [ ] 10 wejść: flash → counter-strafe → pierwszy strzał w 0.3s\n- [ ] Nagrywaj ostatnie 3 podejścia i porównaj timing\n\n### Jak mierzyć sukces\nPrzynajmniej 5/10 wejść kończy się trafieniem pierwszej kuli.',
    },
    {
      title: 'Demo review — 1 połowa własnego meczu (możesz wgrać do nas)',
      minutes: 25,
      description:
        '### Cel\nNaucz się patrzeć na własną grę jak trener: szukaj przyczyn, nie symptomów.\n\n### Jak robić\n- [ ] Obejrzyj pierwszą połowę ostatniego meczu na 2x\n- [ ] Przy każdej śmierci: zatrzymaj i nazwij błąd jednym słowem\n- [ ] Zapisz 3 najczęstsze — to Twój plan na kolejny tydzień\n\n### Jak mierzyć sukces\nMasz listę 3 błędów, które powtarzają się najczęściej.',
    },
    {
      title: 'Mecz — 2 gry z celem z demo review',
      minutes: 90,
      description:
        '### Cel\nPracuj nad TYM jednym błędem, który wyniósłeś z demka.\n\n### Jak robić\n- [ ] Przed meczem: przypomnij sobie swój główny błąd z dema\n- [ ] Po każdej połowie: jedna notatka — czy błąd się powtórzył?\n- [ ] Nie karz się za przegrane rundy — karz się za powtórzony błąd\n\n### Jak mierzyć sukces\nDruga połowa ma mniej powtórzonych błędów niż pierwsza.',
    },
    {
      title: 'Dzień kontrolny — Aim Botz 100 + DM 10 min, porównanie',
      minutes: 25,
      description:
        '### Cel\nTwardy pomiar tygodnia: czy tempo poszło w górę bez utraty precyzji?\n\n### Jak robić\n- [ ] Aim Botz 100 killi — porównaj % HS z dniem 1\n- [ ] DM 10 min — porównaj K/D i „pierwsza kula” z dniem 2\n- [ ] Zapisz obie liczby w notatce dnia w kalendarzu\n\n### Jak mierzyć sukces\nObie metryki równe lub lepsze niż na starcie tygodnia.',
    },
  ],
  ADVANCED: [
    {
      title: 'Warm-up precision: Aim Botz 150 + Kovaak/Aimlabs 10 min',
      minutes: 20,
      description:
        '### Cel\nRozgrzewka z metrykami, nie mielenie.\n\n### Jak robić\n- [ ] Aim Botz 150 killi: 50 statyczne, 50 A-D, 50 w biegu\n- [ ] Kovaak/Aimlabs: scenariusz tracking + microflicks\n- [ ] Cel: pierwsza kula celna od pierwszej minuty, nie od piątej\n\n### Jak mierzyć sukces\nPierwszy pojedynek w DM wygrany pierwszą kulą.',
    },
    {
      title: 'Prefire + off-angle: 2 mapy, 4 pozycje',
      minutes: 20,
      description:
        '### Cel\nWyprzedzaj graczy, którzy myślą standardowo.\n\n### Jak robić\n- [ ] 2 mapy × 2 pozycje: standardowa + off-angle (o pół kroku dalej)\n- [ ] 15 przejść każdej: pre-aim kąt → reakcja na dźwięk\n- [ ] Off-angle zmienia timing — celownik dostosuj o pół wysokości\n\n### Jak mierzyć sukces\nW meczu złapiesz 2 fragi na off-angle, których standardowo by nie było.',
    },
    {
      title: 'Recoil transfer + spray control na dystansach',
      minutes: 15,
      description:
        '### Cel\nSpray na 20+ metrów bez paniki: pierwszy burst celny na każdym dystansie.\n\n### Jak robić\n- [ ] Aim Botz: 10 serii po 20 pocisków z dystansu long\n- [ ] Przenoś celownik między „głowami” w rytm wzoru\n- [ ] Zapisz: który dystans jest Twoim najgorszym?\n\n### Jak mierzyć sukces\nNajgorszy dystans: 5/10 serii celnych w pierwszych 10 pociskach.',
    },
    {
      title: 'Analiza pro demo — 1 połowa (na 2x, z pauzami)',
      minutes: 30,
      description:
        '### Cel\nKradnij decyzje, nie tylko crosshair placement.\n\n### Jak robić\n- [ ] Obejrzyj połowę pro z perspektywy JEDNEGO gracza\n- [ ] Przy każdej rundzie: co zrobił zanim zobaczył wroga?\n- [ ] Zapisz 3 decyzje do skopiowania w swoim meczu dziś\n\n### Jak mierzyć sukces\nMasz 3 konkretne decyzje (pozycja, timing, util) do wdrożenia.',
    },
    {
      title: 'Utility pack: pełne smoki/flashe na 1 mapę',
      minutes: 20,
      description:
        '### Cel\nUtility, które robisz W MECZU, a nie tylko w treningu.\n\n### Jak robić\n- [ ] Wybierz mapę: 5 line-upów, których nie masz opanowanych\n- [ ] 10 powtórzeń każdego: z ruchu, pod presją czasu\n- [ ] Zapisz, które 2 będą Twoje w meczu\n\n### Jak mierzyć sukces\nW meczu rzucisz minimum 2 z 5 wytrenowanych line-upów.',
    },
    {
      title: 'Mecz — 2 gry z celem z pro demo',
      minutes: 90,
      description:
        '### Cel\nWdrożenie decyzji z demka pro pod presją ranked.\n\n### Jak robić\n- [ ] Przed meczem: 3 decyzje z wczorajszej analizy na kartce\n- [ ] W meczu: tylko one się liczą, nie wynik\n- [ ] Po meczu: 1 akapit — co zadziałało, co nie i dlaczego\n\n### Jak mierzyć sukces\nPrzynajmniej 1 z 3 decyzji zadziałała w kluczowej rundzie.',
    },
    {
      title: 'Dzień kontrolny — staty + plan na kolejny tydzień',
      minutes: 30,
      description:
        '### Cel\nZamknij tydzień twardymi liczbami i następnym celem.\n\n### Jak robić\n- [ ] Sprawdź trend statów w panelu (reakcja, pre-aim, celność)\n- [ ] Porównaj z notatką z dnia 1\n- [ ] Zapisz 1 cel na kolejny tydzień i dodaj go do swoich Celów\n\n### Jak mierzyć sukces\nMasz plan na kolejny tydzień zapisany w panelu — nie w głowie.',
    },
  ],
}

export function getStarterRoutine(level: StarterRoutineLevel): StarterRoutineDef {
  const tasks = BASE_TASKS[level]
  return {
    title: `Pierwsze 7 dni — fundament pod Elo (${LEVEL_LABELS[level]})`,
    description:
      level === 'BEGINNER'
        ? 'Siedem dni, które budują fundament: celownik, kontrola sprayu, movement i pierwsze zastosowanie w meczu. Każdy dzień mówi Ci dokładnie co robić, jak długo i jak zmierzyć progres.'
        : level === 'INTERMEDIATE'
          ? 'Siedem dni na przełamanie stagnacji: tempo, prefire, demo review i praca nad TYM jednym błędem, który powtarzasz w meczach. Codziennie znasz cel i metrykę sukcesu.'
          : 'Siedem dni pod Faceit: prefire i off-angle, kontrola sprayu na dystans, analiza pro demo i wdrożenie decyzji pod presją ranked. Trening jak pro, z metrykami.',
    totalMinutes: tasks.reduce((acc, t) => acc + t.minutes, 0),
    tasks,
  }
}

export function isStarterLevel(v: unknown): v is StarterRoutineLevel {
  return typeof v === 'string' && (STARTER_ROUTINE_LEVELS as readonly string[]).includes(v)
}
