"""CLI for detailing-crm."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__
from .calendar_export import export_and_store, list_calendar_names
from .contacts import export_csv, rebuild_contacts, stats
from .db import default_db_path
from .parser import parse_title


def _cmd_calendars(_: argparse.Namespace) -> int:
    names = list_calendar_names()
    if not names:
        print("No calendars found (or access denied).")
        return 1
    for name in names:
        print(name)
    return 0


def _cmd_export(args: argparse.Namespace) -> int:
    n, path = export_and_store(
        start=args.start,
        end=args.end,
        calendar_filter=args.calendar or "",
        db_path=Path(args.db) if args.db else None,
    )
    print(f"OK — {n} events → {path}")
    return 0


def _cmd_build(args: argparse.Namespace) -> int:
    db = Path(args.db) if args.db else None
    n = rebuild_contacts(db_path=db)
    out = export_csv(
        out_path=Path(args.out) if args.out else None,
        db_path=db,
    )
    s = stats(db_path=db)
    print(f"Contacts: {n}")
    print(f"Events: {s['events']} (with phone: {s['events_with_phone']})")
    print(f"CSV: {out}")
    return 0


def _cmd_stats(args: argparse.Namespace) -> int:
    s = stats(db_path=Path(args.db) if args.db else None)
    print(json.dumps(s, indent=2, ensure_ascii=False))
    return 0


def _cmd_parse(args: argparse.Namespace) -> int:
    p = parse_title(args.title)
    print(
        json.dumps(
            {
                "phone_e164": p.phone_e164,
                "name": p.name,
                "car": p.car,
                "service": p.service,
                "remainder": p.remainder,
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    return 0


def _cmd_pipeline(args: argparse.Namespace) -> int:
    """export → build → csv in one go."""
    export_ns = argparse.Namespace(
        start=args.start,
        end=args.end,
        calendar=args.calendar,
        db=args.db,
    )
    rc = _cmd_export(export_ns)
    if rc != 0:
        return rc
    build_ns = argparse.Namespace(db=args.db, out=args.out)
    return _cmd_build(build_ns)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="detailing-crm",
        description="Extract client phones from Apple Calendar into a local SQLite DB + CSV.",
    )
    p.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    p.add_argument(
        "--db",
        default=str(default_db_path()),
        help=f"SQLite path (default: {default_db_path()})",
    )

    sub = p.add_subparsers(dest="command", required=True)

    c = sub.add_parser("calendars", help="List Calendar.app calendar names")
    c.set_defaults(func=_cmd_calendars)

    e = sub.add_parser("export", help="Export events from Calendar.app into SQLite")
    e.add_argument("--start", default="2021-01-01", help="Start date YYYY-MM-DD")
    e.add_argument("--end", default="2026-12-31", help="End date YYYY-MM-DD")
    e.add_argument(
        "--calendar",
        default="sowa.progamer@gmail.com",
        help="Exact Calendar.app calendar name (default: sowa.progamer@gmail.com)",
    )
    e.set_defaults(func=_cmd_export)

    b = sub.add_parser("build", help="Parse events → contacts table + CSV")
    b.add_argument(
        "--out",
        default="",
        help="CSV output path (default: data/contacts.csv)",
    )
    b.set_defaults(func=_cmd_build)

    s = sub.add_parser("stats", help="Show DB counts")
    s.set_defaults(func=_cmd_stats)

    parse_p = sub.add_parser("parse", help="Debug-parse a single title")
    parse_p.add_argument("title", help="Event title to parse")
    parse_p.set_defaults(func=_cmd_parse)

    pipe = sub.add_parser("pipeline", help="export + build in one command")
    pipe.add_argument("--start", default="2021-01-01")
    pipe.add_argument("--end", default="2026-12-31")
    pipe.add_argument("--calendar", default="sowa.progamer@gmail.com")
    pipe.add_argument("--out", default="")
    pipe.set_defaults(func=_cmd_pipeline)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    # Normalize empty --out
    if hasattr(args, "out") and args.out == "":
        args.out = None
    try:
        return args.func(args)
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130
    except Exception as exc:  # noqa: BLE001 — CLI surface
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
