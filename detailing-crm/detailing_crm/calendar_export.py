"""Export events from macOS Calendar.app via AppleScript (bulk property fetch)."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from .db import connect, default_db_path, init_db


def applescript_path() -> Path:
    return Path(__file__).resolve().parent.parent / "scripts" / "export_calendar.applescript"


def fetch_events(
    start: str,
    end: str,
    calendar_filter: str = "sowa.progamer@gmail.com",
    timeout: int = 1200,
) -> list[dict[str, Any]]:
    """
    calendar_filter: exact Calendar.app calendar name (default: Gmail detailing calendar).
    """
    script = applescript_path()
    if not script.exists():
        raise FileNotFoundError(f"Missing AppleScript: {script}")

    cal_name = calendar_filter or "sowa.progamer@gmail.com"
    out_file = Path(tempfile.gettempdir()) / "detailing_crm_events.json"
    if out_file.exists():
        out_file.unlink()

    cmd = [
        "osascript",
        str(script),
        start,
        end,
        cal_name,
        str(out_file),
    ]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(
            "Calendar export timed out. Grant Automation access: "
            "System Settings → Privacy & Security → Automation → Terminal/Cursor → Calendar."
        ) from exc

    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(
            "Calendar export failed.\n"
            f"{err}\n\n"
            "Grant access: System Settings → Privacy & Security → Calendar / Automation."
        )

    msg = (proc.stdout or "").strip()
    if msg:
        print(msg, file=sys.stderr)

    if not out_file.exists():
        raise RuntimeError(f"Export did not produce {out_file}")

    raw = out_file.read_text(encoding="utf-8")
    if not raw.strip():
        return []

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Could not parse export JSON ({exc}). First 200 chars:\n{raw[:200]}"
        ) from exc

    if not isinstance(data, list):
        raise RuntimeError("Expected a JSON array of events.")
    return data


def list_calendar_names(timeout: int = 120) -> list[str]:
    script = """
    tell application "Calendar"
      set names to name of every calendar
      set AppleScript's text item delimiters to linefeed
      set out to names as string
      set AppleScript's text item delimiters to ""
      return out
    end tell
    """
    proc = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(f"Could not list calendars:\n{err}")
    raw = (proc.stdout or "").strip()
    return [line for line in raw.splitlines() if line.strip()]


def upsert_events(events: list[dict[str, Any]], db_path=None) -> int:
    conn = connect(db_path)
    init_db(conn)
    count = 0
    with conn:
        for ev in events:
            conn.execute(
                """
                INSERT INTO events (
                    event_id, calendar_name, title, notes,
                    start_at, end_at, all_day, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(event_id) DO UPDATE SET
                    calendar_name = excluded.calendar_name,
                    title = excluded.title,
                    notes = excluded.notes,
                    start_at = excluded.start_at,
                    end_at = excluded.end_at,
                    all_day = excluded.all_day,
                    raw_json = excluded.raw_json,
                    imported_at = datetime('now')
                """,
                (
                    ev.get("event_id") or "",
                    ev.get("calendar_name") or "",
                    ev.get("title") or "",
                    ev.get("notes") or "",
                    ev.get("start_at") or "",
                    ev.get("end_at"),
                    int(ev.get("all_day") or 0),
                    json.dumps(ev, ensure_ascii=False),
                ),
            )
            count += 1
    conn.close()
    return count


def export_and_store(
    start: str,
    end: str,
    calendar_filter: str = "sowa.progamer@gmail.com",
    db_path=None,
) -> tuple[int, Path]:
    path = db_path or default_db_path()
    print(f"Exporting Calendar events {start} → {end} …", file=sys.stderr)
    print(f"Calendar: {calendar_filter or 'sowa.progamer@gmail.com'}", file=sys.stderr)
    events = fetch_events(start, end, calendar_filter=calendar_filter)
    n = upsert_events(events, db_path=path)
    print(f"Stored {n} events in {path}", file=sys.stderr)
    return n, path
