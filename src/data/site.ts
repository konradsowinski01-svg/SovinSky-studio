/** Podmień dane kontaktowe przed wysyłką SMS-ów. */
export const site = {
  brand: "SowinSky Studio",
  brandShort: "SowinSky",
  tagline: ["Projektuję. Buduję. Wdrażam.", "Aplikacje iOS, Android, Web App, Strony WWW."],
  lead: "Od szkicu do gotowego produktu, end to end.",
  location: "Polska",
  status: "Otwarty na nowe projekty.",
  email: "konrad.sowinski01@gmail.com",
  phone: "+48 574 123 044",
  whatsapp: "48574123044",
  about:
    "SowinSky Studio to miejsce, gdzie pomysł przeradza się w szkic, a następnie w realny produkt. Wszystko co robię powstaje z dbałością o detale i estetykę. Buduję strony i aplikacje od podstaw. Pracuję szybko, z naciskiem na wygląd, czytelność i funkcjonalność.",
  /** Copy tylko na stronę #/about — pierwsza osoba, bliżej człowieka. */
  aboutPage: {
    intro:
      "Cześć, jestem Konrad. Od zawsze lubiłem wyrażać siebie poprzez twórczość i zamieniać własne wizje w rzeczywistość. Dziś realizuję tę pasję, tworząc projekty dla swoich klientów. W każdy z nich wkładam cząstkę siebie, dbając o to, by efekt końcowy był czymś, z czego naprawdę mogę być dumny. Lubię, gdy poza estetyką projekt ma również swój charakter, artystyczny sznyt i drobne detale, które nadają mu wyjątkowości.",
    cta: "Napisz do mnie",
    story:
      "Buduję aplikacje iOS i Android, strony WWW, sklepy internetowe i web appki. Zaczynam od pomysłu i szkicu, potem koduję, dopracowuję detale i dowożę gotowy produkt: publikację w App Store albo Sklepie Play, lub stronę działającą na serwerze. Projektuję i wdrażam też rozwiązania szyte pod konkretną firmę: panele wewnętrzne, automatyzacje i własne rozwiązania, które mają wyglądać dobrze i działać na co dzień.",
  },
  serviceGroups: [
    {
      title: "Platformy",
      items: ["iOS", "Android", "macOS", "Windows"],
    },
    {
      title: "Web",
      items: ["Strony WWW", "Sklepy internetowe", "Aplikacje webowe", "Opieka nad stronami"],
    },
    {
      title: "Dla firm",
      items: [
        "Wdrażanie aplikacji na App Store i Sklep Play",
        "Indywidualne aplikacje wewnętrzne - rozwiązania dla firm",
        "Automatyzacje",
      ],
    },
  ],
} as const;

export type Project = {
  slug: string;
  title: string;
  kind: string;
  year: string;
  gradient: string;
  tone: "dark" | "warm" | "bright";
  /** Zewnętrzny link (np. App Store). Bez tego — #contact. */
  href?: string;
  /** Okładka brandowa (ścieżka w `public/`). */
  cover?: string;
  /** Krótki opis na hover w portfolio. */
  blurb?: string;
};

export const projects: Project[] = [
  {
    slug: "arngcor",
    title: "ARNGCOR",
    kind: "Aplikacja iOS · App Store",
    year: "2025",
    tone: "warm",
    gradient: "linear-gradient(145deg, #ff5a1f 0%, #9a3412 42%, #1a0a05 100%)",
    href: "https://apps.apple.com/app/arngcor/id6772146674",
    cover: "projects/arngcor/cover-v2.jpg",
    blurb:
      "ARNGCOR to aplikacja mobilna, która pomaga budować zdrowe nawyki ruchowe, rozwijać mobilność i poprawiać elastyczność ciała. Łączy elementy jogi, rozciągania i ćwiczeń inspirowanych fizjoterapią, tworząc przestrzeń do codziennej pracy nad własnym ciałem.\n\nZamiast przypadkowych zestawów ćwiczeń otrzymujesz praktykę dopasowaną do swoich potrzeb, możliwości i wyznaczonych celów. Aplikacja uwzględnia Twój poziom sprawności, aktywność fizyczną i indywidualne preferencje, pomagając znaleźć odpowiednią równowagę między ruchem, regeneracją i rozwojem.\n\nW ARNGCOR znajdziesz codzienne sesje ruchowe, programy rozwijające konkretne umiejętności, takie jak mostek i szpagat, a także krótkie zestawy ćwiczeń ukierunkowane na napięcia i dyskomfort w różnych obszarach ciała.\n\nKażda praktyka to kolejny krok w kierunku większej swobody ruchu. Bez presji, bez konieczności spędzania godzin na treningach i bez potrzeby samodzielnego układania planów.\n\nARNGCOR powstał z myślą o tym, żeby świadomy ruch stał się naturalną częścią codziennego życia.",
  },
  {
    slug: "rrclub",
    title: "RRclub",
    kind: "Prywatna aplikacja pokerowa",
    year: "2026",
    tone: "dark",
    gradient: "linear-gradient(155deg, #1a1028 0%, #2a1840 40%, #050505 100%)",
    cover: "projects/rrclub/cover-v4.jpg",
    blurb:
      "RRclub to prywatna aplikacja klubowa do gry w pokera z przyjaciółmi na chipach i punktach klubowych. Zamiast otwartego kasyna dostajesz zamknięty klub: lobby, żywe stoły i rozgrywkę Texas Hold'em w czasie rzeczywistym, bez prawdziwych pieniędzy i bez wypłat gotówki.\n\nChipy w RRclub nie mają wartości pieniężnej. Służą wyłącznie do rozrywki w gronie klubu. Admin zarządza saldem członków przez Counter, akceptuje nowe konta i prowadzi życie klubu od środka, zamiast zostawiać to przypadkowym transferom między graczami.\n\nW lobby tworzysz i dołączasz do stołów, wybierasz buy-in i miejsce, a potem grasz live: fold, call, raise, blinds, ulice aż do showdownu. Aplikacja wspiera też grę na wielu stołach naraz, historię rąk, powiadomienia o starcie gry oraz narzędzia administracyjne: rankingi, członków, strefy, podatki klubowe i bad beat.\n\nRRclub powstał jako kompletny produkt klubowy na iOS i Android. Od rejestracji i akceptacji członków, przez lobby i serwer gry, po detale stołu i push, kiedy ktoś odpala rozdanie, a Ty akurat nie siedzisz przy feltcie.",
  },
  {
    slug: "rkm-trade",
    title: "R.K.M. TRADE",
    kind: "Strona WWW · handel ciągnikami",
    year: "2026",
    tone: "bright",
    gradient: "linear-gradient(135deg, #fb923c 0%, #ea580c 35%, #111111 100%)",
    href: "https://rkmtrade.pl",
    cover: "projects/rkm-trade/cover.jpg",
    blurb:
      "R.K.M. TRADE to firma działająca w branży rolniczej, specjalizująca się w handlu maszynami i urządzeniami rolniczymi oraz usługach związanych z ich obsługą i serwisowaniem.\n\nCelem projektu było stworzenie profesjonalnej strony internetowej, która w przejrzysty sposób prezentuje działalność firmy, jej ofertę oraz zakres świadczonych usług. Witryna stanowi cyfrową wizytówkę marki, ułatwiając potencjalnym klientom poznanie firmy i nawiązanie kontaktu.\n\nProjekt skupia się na czytelnej prezentacji informacji, intuicyjnej nawigacji i funkcjonalności, dzięki którym użytkownicy mogą szybko odnaleźć interesujące ich treści.\n\nStrona została zaprojektowana z myślą o budowaniu profesjonalnego wizerunku firmy i zapewnieniu jej solidnej obecności w internecie.",
  },
  {
    slug: "arngcor-web",
    title: "ARNGCOR Web",
    kind: "Strona produktowa · arngcor.pl",
    year: "2026",
    tone: "warm",
    gradient: "linear-gradient(160deg, #c2410c 0%, #431407 50%, #050505 100%)",
    href: "https://arngcor.pl",
    cover: "projects/arngcor-web/cover-v2.jpg",
  },
];
