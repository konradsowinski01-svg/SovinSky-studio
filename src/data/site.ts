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
};

export const projects: Project[] = [
  {
    slug: "landing-studio",
    title: "Landing Studio",
    kind: "Landing page",
    year: "2026",
    tone: "warm",
    gradient: "linear-gradient(145deg, #ff5a1f 0%, #9a3412 42%, #1a0a05 100%)",
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
