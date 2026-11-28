# detailing-crm

Lokalna baza klientów z **Apple Calendar** (konto `sowa.progamer@gmail.com`).  
Wyciąga telefony z tytułów wydarzeń, buduje kontakty z kontekstem (auto / usługa / imię) i eksportuje CSV.

Wysyłka SMS — poza zakresem v1.

## Wymagania

- macOS + Calendar.app
- Python 3.9+
- Uprawnienia: **Ustawienia systemowe → Prywatność i ochrona → Automatyzacja** (Terminal / Cursor → Calendar)

## Start

```bash
cd detailing-crm   # z roota SovinSky-studio

# Lista kalendarzy
python3 -m detailing_crm calendars

# Pełny pipeline (eksport + baza + CSV) — ok. 4–6 min przy ~1700 wydarzeniach
python3 -m detailing_crm pipeline --start 2021-01-01 --end 2026-12-31

# Albo krok po kroku:
python3 -m detailing_crm export --start 2021-01-01 --end 2026-12-31
python3 -m detailing_crm build
python3 -m detailing_crm stats
```

Inny kalendarz (dokładna nazwa z `calendars`):

```bash
python3 -m detailing_crm pipeline --calendar "Nazwa kalendarza"
```

## Wyniki

| Plik | Opis |
|------|------|
| `data/crm.db` | SQLite: `events`, `contacts`, `contact_events` |
| `data/contacts.csv` | Lista numerów do przeglądu w Numbers / Excel |

Kolumny CSV: telefon, sugerowana nazwa, `display_name` (ręczne), auta, usługi, liczba wizyt, pierwsza/ostatnia wizyta, przykładowe tytuły.

## Debug parsera

```bash
python3 -m detailing_crm parse "691616001 Bmw pranie tapicerki"
```

## Testy

```bash
cd detailing-crm
PYTHONPATH=. python3 -m unittest discover -s tests -v
```

## Uwagi

- Wpisy bez numeru zostają w `events`, ale nie tworzą kontaktu.
- Sugerowana nazwa = imię z tytułu, jeśli kiedyś padło; inaczej `Klient · auto · N wizyty · ost. RRRR-MM`.
- Eksport używa AppleScript (zbiorczy odczyt) — pierwszy raz macOS może zapytać o dostęp.
