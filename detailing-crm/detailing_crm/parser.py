"""Parse messy detailing calendar titles into phone / name / car / service."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Optional

# Polish mobile: optional +48 / 0048, optional spaces/dashes, 9 digits starting 4-8
PHONE_RE = re.compile(
    r"(?:(?:\+|00)\s*48[\s\-]*)?"
    r"(?:(?:\(?\s*)?(?:45|50|51|53|57|60|66|69|72|73|78|79|88)(?:[\s\-]?\d){7})"
    r"|(?:(?:\+|00)\s*48[\s\-]*)?(?:\d[\s\-]?){8}\d",
    re.IGNORECASE,
)

# Narrower: require a contiguous run that looks like a PL mobile after digit cleanup
MOBILE_PREFIXES = (
    "45", "50", "51", "53", "57", "60", "66", "69", "72", "73", "78", "79", "88",
)

CAR_BRANDS = [
    "range rover",
    "land rover",
    "mercedes-benz",
    "mercedes",
    "alfa romeo",
    "aston martin",
    "rolls royce",
    "bmw",
    "audi",
    "honda",
    "toyota",
    "mustang",
    "ford",
    "volvo",
    "opel",
    "astra",
    "volkswagen",
    "vw",
    "skoda",
    "škoda",
    "seat",
    "cupra",
    "renault",
    "peugeot",
    "citroen",
    "citroën",
    "fiat",
    "mazda",
    "nissan",
    "hyundai",
    "kia",
    "suzuki",
    "subaru",
    "lexus",
    "infiniti",
    "jaguar",
    "porsche",
    "tesla",
    "mini",
    "jeep",
    "dodge",
    "chrysler",
    "chevrolet",
    "chevy",
    "dacia",
    "mitsubishi",
    "bentley",
    "ferrari",
    "lamborghini",
    "maserati",
    "smart",
    "saab",
    "puma",
    "chr",
    "corolla",
    "golf",
    "passat",
    "octavia",
    "superb",
    "tucson",
    "sportage",
    "rav4",
    "rav 4",
    "smax",
    "s-max",
    "hr-v",
    "hrv",
]

SERVICES = [
    "sprzątanie wnętrza",
    "sprzatanie wnetrza",
    "sprzątanie wnętrz",
    "sprzatanie wnetrz",
    "pranie tapicerki",
    "pranie siedzeń",
    "pranie siedzen",
    "korekta lakieru",
    "powłoka ceramiczna",
    "powloka ceramiczna",
    "wosk wnętrz",
    "wosk wnetrz",
    "wosk",
    "pranie",
    "polerka",
    "polerowanie",
    "detailing",
    "sprzątanie",
    "sprzatanie",
    "mycie",
    "czyszczenie",
    "zaprawki",
    "zaprawka",
    "ceramiczna",
    "ceramika",
    "folia",
    "ppf",
    "odświeżanie",
    "odswiezanie",
    "renowacja",
    "lakier",
    "wnętrze",
    "wnetrze",
    "wnętrz",
    "wnetrz",
    "zewnątrz",
    "zewnatrz",
]

# Words that are not person names even if capitalized
NAME_STOPWORDS = {
    "wosk", "pranie", "polerka", "sprzątanie", "sprzatanie", "mycie", "detailing",
    "bmw", "audi", "honda", "toyota", "ford", "volvo", "opel", "astra", "mercedes",
    "mustang", "range", "rover", "land", "dzień", "dzien", "wcześniej", "wczesniej",
    "rano", "południe", "poludnie", "wieczór", "wieczor", "auto", "samochód",
    "samochod", "klient", "wizyta", "termin", "nałożenie", "nalozenie", "liczniki",
    "kończy", "konczy", "się", "sie", "od", "do", "i", "z", "na", "po", "bez",
    "ciemne", "jasne", "pełne", "pelne", "pakiet", "basic", "premium", "gold",
    "zamówić", "zamowic", "zamówienie", "zamowienie", "lakier", "okolo", "około",
    "puma", "hr-v", "hrv", "smax", "s-max", "zł", "zl", "pln",
    "woskowanie", "felgi", "felga", "caddy", "xceed", "octavia", "superb",
    "regeneracja", "siedzenia", "siedzenie", "maska", "zderzak", "szyba",
    "podłoga", "podloga", "dywanik", "tapicerki", "tapicerka", "skory", "skóry",
    "plama", "rysa", "rysy", "przód", "przod", "tył", "tyl", "bok", "boku",
}


@dataclass
class ParsedTitle:
    phone_e164: Optional[str]
    name: Optional[str]
    car: Optional[str]
    service: Optional[str]
    remainder: str


def _strip_accents(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def normalize_phone(raw: str) -> Optional[str]:
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("0048"):
        digits = digits[4:]
    elif digits.startswith("48") and len(digits) >= 11:
        digits = digits[2:]
    if len(digits) != 9:
        return None
    if not digits.startswith(MOBILE_PREFIXES):
        # Still accept other 9-digit PL mobiles that slipped past prefix list
        if not digits[0] in "456789":
            return None
    return f"+48{digits}"


def extract_phone(title: str) -> tuple[Optional[str], str]:
    """Return (e164 or None, title with phone removed)."""
    best: Optional[re.Match[str]] = None
    best_phone: Optional[str] = None

    for match in PHONE_RE.finditer(title):
        phone = normalize_phone(match.group(0))
        if phone:
            best = match
            best_phone = phone
            break

    if not best or not best_phone:
        # Fallback: leading 9 digits
        m = re.match(r"^\s*(\d[\d\s\-]{7,}\d)\b", title)
        if m:
            phone = normalize_phone(m.group(1))
            if phone:
                rest = (title[: m.start()] + title[m.end() :]).strip(" -–—|,;")
                return phone, rest
        return None, title.strip()

    rest = (title[: best.start()] + title[best.end() :]).strip(" -–—|,;")
    return best_phone, rest


def _find_longest(haystack_lower: str, phrases: list[str]) -> Optional[str]:
    ordered = sorted(phrases, key=len, reverse=True)
    for phrase in ordered:
        if phrase.lower() in haystack_lower:
            return phrase
    return None


def extract_car(text: str) -> tuple[Optional[str], str]:
    lower = text.lower()
    # Prefer multi-word brands first (list already has long phrases)
    ordered = sorted(CAR_BRANDS, key=len, reverse=True)
    for brand in ordered:
        pat = re.compile(rf"(?<!\w){re.escape(brand)}(?!\w)", re.IGNORECASE)
        m = pat.search(text)
        if not m:
            continue
        # Try to pull following model token(s) like "a7", "chr", "v40"
        end = m.end()
        # Pull a short model token (e.g. a7, f10, v40, hr-v) — not prices/services
        model_m = re.match(
            r"[\s\-]*([A-Za-z][A-Za-z0-9\-]{0,7}|\d{2,3}[A-Za-z]?)",
            text[end:],
        )
        car = m.group(0)
        consume_end = end
        if model_m:
            extra = model_m.group(1).strip()
            extra_l = _strip_accents(extra.lower())
            service_stems = {_strip_accents(s.lower()) for s in SERVICES}
            looks_like_price = bool(re.search(r"\d{3,}", extra)) and "zł" in text[end:end+20].lower()
            is_service = extra_l in service_stems or any(
                _strip_accents(s.lower()).startswith(extra_l) or extra_l.startswith(
                    _strip_accents(s.lower())[:4]
                )
                for s in SERVICES
                if len(s) > 3
            )
            if extra and not looks_like_price and not is_service and extra_l not in NAME_STOPWORDS:
                car = f"{car} {extra}".strip()
                consume_end = end + model_m.end()
        # If brand itself is a model alias (astra, chr), keep as-is
        rest = (text[: m.start()] + text[consume_end:]).strip(" -–—|,;")
        return car.strip(), rest
    return None, text.strip()


def extract_service(text: str) -> tuple[Optional[str], str]:
    lower = _strip_accents(text.lower())
    ordered = sorted(SERVICES, key=len, reverse=True)
    for service in ordered:
        needle = _strip_accents(service.lower())
        idx = lower.find(needle)
        if idx < 0:
            continue
        # Map back roughly via regex on original (accent-insensitive is hard;
        # search case-insensitive on original phrase variants)
        pat = re.compile(re.escape(service), re.IGNORECASE)
        m = pat.search(text)
        if not m:
            # Try accent-stripped match by scanning words — keep service label
            rest = text
            return service, rest
        rest = (text[: m.start()] + text[m.end() :]).strip(" -–—|,;")
        return service, rest
    return None, text.strip()


def extract_name(text: str) -> tuple[Optional[str], str]:
    text = text.strip(" -–—|,;")
    if not text:
        return None, ""

    # Patterns: "Mama Dawida", "Tata Brajana", "Pan Kowalski", single/multi names
    rel = re.match(
        r"^(Mama|Tata|Pan|Pani|Brat|Siostra|Żona|Zona|Mąż|Maz)\s+([A-ZĄĆĘŁŃÓŚŹŻ][\wąćęłńóśźż\-]+)",
        text,
        re.IGNORECASE,
    )
    if rel:
        name = f"{rel.group(1).capitalize()} {rel.group(2)}"
        rest = text[rel.end() :].strip(" -–—|,;")
        return name, rest

    # Leading capitalized word(s) that aren't stopwords / cars / services
    tokens = text.split()
    name_parts: list[str] = []
    consumed = 0
    for i, tok in enumerate(tokens):
        clean = tok.strip(".,;:!?()[]\"'")
        if not clean:
            consumed = i + 1
            continue
        low = _strip_accents(clean.lower())
        if low in NAME_STOPWORDS:
            break
        if any(low == _strip_accents(b.lower()) for b in CAR_BRANDS):
            break
        if any(low.startswith(_strip_accents(s.lower())[:5]) for s in SERVICES if len(s) > 4):
            break
        if clean.isdigit():
            break
        # Accept if looks like a name (letter start)
        if not re.match(r"^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]", clean):
            break
        # Require capital letter (typical for a person name in these titles)
        if not re.match(r"^[A-ZĄĆĘŁŃÓŚŹŻ]", clean):
            break
        if len(clean) < 3:
            break
        name_parts.append(clean)
        consumed = i + 1
        if len(name_parts) >= 2:
            break
        if i + 1 < len(tokens):
            nxt = tokens[i + 1].strip(".,;:!?()[]\"'")
            nxt_l = _strip_accents(nxt.lower())
            if nxt_l in NAME_STOPWORDS or any(
                nxt_l == _strip_accents(b.lower()) for b in CAR_BRANDS
            ):
                break
            if not re.match(r"^[A-ZĄĆĘŁŃÓŚŹŻ]", nxt):
                break
        else:
            break

    if not name_parts:
        return None, text

    name = " ".join(name_parts)
    # Reject if the only "name" is too generic / service-like
    if _strip_accents(name.lower()) in NAME_STOPWORDS:
        return None, text

    rest = " ".join(tokens[consumed:]).strip(" -–—|,;")
    return name, rest


def parse_title(title: str) -> ParsedTitle:
    if not title or not title.strip():
        return ParsedTitle(None, None, None, None, "")

    phone, rest = extract_phone(title)
    name, rest = extract_name(rest)
    car, rest = extract_car(rest)
    service, rest = extract_service(rest)
    remainder = re.sub(r"\s+", " ", rest).strip(" -–—|,;")

    return ParsedTitle(
        phone_e164=phone,
        name=name,
        car=car,
        service=service,
        remainder=remainder,
    )
