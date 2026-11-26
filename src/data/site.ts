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
      "Cześć, jestem Konrad. Wolę skracać dystans: bez korpo-mowy, konkretnie i po ludzku. Jeśli masz pomysł albo coś, co trzeba ogarnąć - napisz, pogadamy.",
    cta: "Napisz do mnie",
    story:
      "Projektuję i buduję strony oraz aplikacje od podstaw. Zależy mi na wyglądzie, czytelności i tym, żeby produkt naprawdę działał na co dzień. Pracuję szybko, ale nie na skróty - detale i estetyka są dla mnie częścią roboty, nie dodatkiem na koniec.",
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
  /** Okładka / kolaż (ścieżka w `public/`). */
  cover?: string;
  /** Realne screeny aplikacji pokazywane w kafelku. */
  shots?: string[];
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
    cover: "projects/arngcor/cover.jpg",
    shots: [
      "projects/arngcor/phone-1.jpg",
      "projects/arngcor/phone-2.jpg",
      "projects/arngcor/phone-3.jpg",
    ],
  },
  {
    slug: "firma-online",
    title: "Firma Online",
    kind: "Strona firmowa",
    year: "2026",
    tone: "dark",
    gradient: "linear-gradient(155deg, #2a1210 0%, #7c2d12 40%, #0a0a0a 100%)",
  },
  {
    slug: "app-panel",
    title: "App Panel",
    kind: "Aplikacja webowa",
    year: "2025",
    tone: "bright",
    gradient: "linear-gradient(135deg, #fb923c 0%, #ea580c 35%, #111111 100%)",
  },
  {
    slug: "kampania-sms",
    title: "Kampania SMS",
    kind: "Landing pod marketing",
    year: "2025",
    tone: "warm",
    gradient: "linear-gradient(160deg, #c2410c 0%, #431407 50%, #050505 100%)",
  },
];
