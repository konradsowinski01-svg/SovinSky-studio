import EventKit
import Foundation

struct OutEvent: Codable {
    let event_id: String
    let calendar_name: String
    let title: String
    let notes: String
    let start_at: String
    let end_at: String?
    let all_day: Int
}

func iso(_ date: Date) -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f.string(from: date)
}

func parseDay(_ s: String, endOfDay: Bool) -> Date {
    let parts = s.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return Date() }
    var c = DateComponents()
    c.year = parts[0]
    c.month = parts[1]
    c.day = parts[2]
    if endOfDay {
        c.hour = 23; c.minute = 59; c.second = 59
    } else {
        c.hour = 0; c.minute = 0; c.second = 0
    }
    return Calendar.current.date(from: c) ?? Date()
}

let args = CommandLine.arguments
let startStr = args.count > 1 ? args[1] : "2021-01-01"
let endStr = args.count > 2 ? args[2] : "2026-12-31"
let filter = args.count > 3 ? args[3].lowercased() : ""

let store = EKEventStore()
let sem = DispatchSemaphore(value: 0)
var authError: String?

if #available(macOS 14.0, *) {
    store.requestFullAccessToEvents { granted, error in
        if !granted {
            authError = error?.localizedDescription ?? "Calendar access denied"
        }
        sem.signal()
    }
} else {
    store.requestAccess(to: .event) { granted, error in
        if !granted {
            authError = error?.localizedDescription ?? "Calendar access denied"
        }
        sem.signal()
    }
}
sem.wait()

if let authError = authError {
    fputs("Error: \(authError)\n", stderr)
    exit(1)
}

let start = parseDay(startStr, endOfDay: false)
let end = parseDay(endStr, endOfDay: true)

var calendars = store.calendars(for: .event)
if !filter.isEmpty {
    calendars = calendars.filter { $0.title.lowercased().contains(filter) }
}

let predicate = store.predicateForEvents(withStart: start, end: end, calendars: calendars)
let events = store.events(matching: predicate)

var out: [OutEvent] = []
out.reserveCapacity(events.count)

for ev in events {
    let id = ev.eventIdentifier ?? "\(ev.calendarItemIdentifier)"
    let calName = ev.calendar?.title ?? ""
    out.append(
        OutEvent(
            event_id: id,
            calendar_name: calName,
            title: ev.title ?? "",
            notes: ev.notes ?? "",
            start_at: iso(ev.startDate),
            end_at: ev.endDate.map { iso($0) },
            all_day: ev.isAllDay ? 1 : 0
        )
    )
}

let enc = JSONEncoder()
enc.outputFormatting = []
guard let data = try? enc.encode(out), let json = String(data: data, encoding: .utf8) else {
    fputs("Error: JSON encode failed\n", stderr)
    exit(1)
}
print(json)
fputs("Exported \(out.count) events from \(calendars.count) calendar(s)\n", stderr)
