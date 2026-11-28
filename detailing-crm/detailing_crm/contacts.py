"""Build contacts from stored events + export CSV."""

from __future__ import annotations

import csv
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Optional

from .car_value import score_cars_field
from .db import connect, default_db_path, init_db
from .parser import parse_title


@dataclass
class ContactAgg:
    phone_e164: str
    names: list[str] = field(default_factory=list)
    cars: list[str] = field(default_factory=list)
    services: list[str] = field(default_factory=list)
    titles: list[str] = field(default_factory=list)
    event_ids: list[str] = field(default_factory=list)
    starts: list[str] = field(default_factory=list)
    parsed_rows: list[tuple[str, Optional[str], Optional[str], Optional[str]]] = field(
        default_factory=list
    )

    def suggested_name(self) -> str:
        # Prefer most common non-empty name
        counts: dict[str, int] = defaultdict(int)
        for n in self.names:
            if n:
                counts[n] += 1
        if counts:
            return sorted(counts.items(), key=lambda x: (-x[1], x[0]))[0][0]

        cars = self._unique(self.cars)
        car_bit = cars[0] if cars else None
        visits = len(self.event_ids)
        last = max(self.starts) if self.starts else ""
        last_ym = last[:7] if last else "?"
        if car_bit:
            return f"Klient · {car_bit} · {visits} wizyty · ost. {last_ym}"
        return f"Klient · {visits} wizyty · ost. {last_ym}"

    @staticmethod
    def _unique(items: Iterable[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in items:
            key = item.strip().lower()
            if not item or key in seen:
                continue
            seen.add(key)
            out.append(item.strip())
        return out

    def cars_str(self) -> str:
        return "; ".join(self._unique(self.cars))

    def services_str(self) -> str:
        return "; ".join(self._unique(self.services))

    def sample_titles(self, limit: int = 5) -> str:
        return " | ".join(self.titles[:limit])


def rebuild_contacts(db_path: Path | None = None) -> int:
    path = db_path or default_db_path()
    conn = connect(path)
    init_db(conn)

    rows = conn.execute(
        "SELECT event_id, title, notes, start_at FROM events ORDER BY start_at"
    ).fetchall()

    aggs: dict[str, ContactAgg] = {}

    for row in rows:
        title = row["title"] or ""
        # Also scan notes for a phone if title has none
        parsed = parse_title(title)
        phone = parsed.phone_e164
        name = parsed.name
        car = parsed.car
        service = parsed.service

        if not phone and row["notes"]:
            from_notes = parse_title(row["notes"])
            if from_notes.phone_e164:
                phone = from_notes.phone_e164
                name = name or from_notes.name
                car = car or from_notes.car
                service = service or from_notes.service

        if not phone:
            continue

        agg = aggs.get(phone)
        if not agg:
            agg = ContactAgg(phone_e164=phone)
            aggs[phone] = agg

        agg.event_ids.append(row["event_id"])
        agg.starts.append(row["start_at"] or "")
        agg.titles.append(title)
        if name:
            agg.names.append(name)
        if car:
            agg.cars.append(car)
        if service:
            agg.services.append(service)
        agg.parsed_rows.append((row["event_id"], name, car, service))

    with conn:
        conn.execute("DELETE FROM contact_events")
        conn.execute("DELETE FROM contacts")

        for phone, agg in sorted(aggs.items()):
            first = min(agg.starts) if agg.starts else None
            last = max(agg.starts) if agg.starts else None
            suggested = agg.suggested_name()
            cars_str = agg.cars_str()
            car_score, top_car = score_cars_field(cars_str)
            conn.execute(
                """
                INSERT INTO contacts (
                    phone_e164, suggested_name, display_name, cars, services,
                    visit_count, first_visit, last_visit, sample_titles, notes,
                    car_score, top_car, updated_at
                ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, ?, ?, datetime('now'))
                """,
                (
                    phone,
                    suggested,
                    cars_str,
                    agg.services_str(),
                    len(agg.event_ids),
                    first,
                    last,
                    agg.sample_titles(),
                    car_score,
                    top_car or None,
                ),
            )
            for event_id, name, car, service in agg.parsed_rows:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO contact_events (
                        phone_e164, event_id, parsed_name, parsed_car, parsed_service
                    ) VALUES (?, ?, ?, ?, ?)
                    """,
                    (phone, event_id, name, car, service),
                )

    n = len(aggs)
    conn.close()
    return n


def export_csv(out_path: Path | None = None, db_path: Path | None = None) -> Path:
    path = db_path or default_db_path()
    conn = connect(path)
    init_db(conn)

    root = Path(__file__).resolve().parent.parent
    data_dir = root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    dest = out_path or (data_dir / "contacts.csv")

    rows = conn.execute(
        """
        SELECT phone_e164, suggested_name, display_name, cars, top_car, car_score,
               services, visit_count, first_visit, last_visit, sample_titles, notes
        FROM contacts
        ORDER BY car_score DESC, visit_count DESC, last_visit DESC
        """
    ).fetchall()
    conn.close()

    fieldnames = [
        "phone_e164",
        "suggested_name",
        "display_name",
        "cars",
        "top_car",
        "car_score",
        "services",
        "visit_count",
        "first_visit",
        "last_visit",
        "sample_titles",
        "notes",
    ]
    with dest.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row[k] for k in fieldnames})

    return dest


def stats(db_path: Path | None = None) -> dict[str, int]:
    conn = connect(db_path or default_db_path())
    init_db(conn)
    events = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
    contacts = conn.execute("SELECT COUNT(*) FROM contacts").fetchone()[0]
    linked = conn.execute("SELECT COUNT(*) FROM contact_events").fetchone()[0]
    with_phone = conn.execute(
        """
        SELECT COUNT(*) FROM events e
        WHERE EXISTS (
            SELECT 1 FROM contact_events ce WHERE ce.event_id = e.event_id
        )
        """
    ).fetchone()[0]
    conn.close()
    return {
        "events": events,
        "contacts": contacts,
        "contact_events": linked,
        "events_with_phone": with_phone,
    }
