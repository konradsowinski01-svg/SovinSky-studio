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
      "Cześć, jestem Konrad. Od zawsze fascynowało mnie tworzenie własnych rzeczy i przeradzanie wizji w realne rzeczy.",
    cta: "Napisz do mnie",
    story:
      "Teraz spełniam się, tworząc projekty dla moich klientów, w które zawsze wkładam część siebie — tak, żeby być dumny ze wszystkiego, co stworzę, i tak, żeby moje projekty miały też w sobie artyzm i ciekawe smaczki.",
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
  },
  {
    slug: "rrclub",
    title: "RRclub",
    kind: "Prywatna aplikacja pokerowa",
    year: "2026",
    tone: "dark",
    gradient: "linear-gradient(155deg, #1a1028 0%, #2a1840 40%, #050505 100%)",
    cover: "projects/rrclub/cover-v4.jpg",
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
