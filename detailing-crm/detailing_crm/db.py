"""SQLite schema and helpers."""

from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    calendar_name TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    start_at TEXT NOT NULL,
    end_at TEXT,
    all_day INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT,
    imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
    phone_e164 TEXT PRIMARY KEY,
    suggested_name TEXT,
    display_name TEXT,
    cars TEXT,
    services TEXT,
    visit_count INTEGER NOT NULL DEFAULT 0,
    first_visit TEXT,
    last_visit TEXT,
    sample_titles TEXT,
    notes TEXT,
    car_score INTEGER NOT NULL DEFAULT 0,
    top_car TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_events (
    phone_e164 TEXT NOT NULL,
    event_id TEXT NOT NULL,
    parsed_name TEXT,
    parsed_car TEXT,
    parsed_service TEXT,
    PRIMARY KEY (phone_e164, event_id),
    FOREIGN KEY (phone_e164) REFERENCES contacts(phone_e164),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_at);
CREATE INDEX IF NOT EXISTS idx_contact_events_phone ON contact_events(phone_e164);
"""


def default_db_path() -> Path:
    root = Path(__file__).resolve().parent.parent
    data = root / "data"
    data.mkdir(parents=True, exist_ok=True)
    return data / "crm.db"


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    path = db_path or default_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    # Lightweight migrations for existing DBs
    cols = {row[1] for row in conn.execute("PRAGMA table_info(contacts)").fetchall()}
    if "car_score" not in cols:
        conn.execute(
            "ALTER TABLE contacts ADD COLUMN car_score INTEGER NOT NULL DEFAULT 0"
        )
    if "top_car" not in cols:
        conn.execute("ALTER TABLE contacts ADD COLUMN top_car TEXT")
    conn.commit()
