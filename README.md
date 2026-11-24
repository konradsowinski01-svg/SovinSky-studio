# SowinSky Studio

Portfolio i oferta — strony oraz aplikacje. Klimat inspirowany nowoczesnymi studio portfolio (layout + motion), z własną marką i treścią.

## Lokalnie

```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)

1. Repo Settings → Pages → Source: **GitHub Actions**
2. Push na `main` odpala workflow `.github/workflows/deploy.yml`
3. Adres: `https://<user>.github.io/SovinSky-studio/`

`vite.config.ts` ma `base: "/SovinSky-studio/"` — zmień, jeśli nazwa repo będzie inna.

## Treści do podmiany

Edytuj [`src/data/site.ts`](src/data/site.ts):

- e-mail, telefon, WhatsApp
- teksty about / usługi
- projekty (później wrzuć screenshoty zamiast gradientów)

Kolory: [`src/styles/global.css`](src/styles/global.css) (`--accent`, `--black`, …).
