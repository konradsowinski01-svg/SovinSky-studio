#!/usr/bin/osascript
-- Bulk-export Calendar events to a UTF-8 JSON file (arg 4 = output path).
-- Usage:
--   osascript export_calendar.applescript 2021-01-01 2026-12-31 "sowa.progamer@gmail.com" /tmp/events.json

use AppleScript version "2.4"
use framework "Foundation"
use scripting additions

on dateFromYMD(ymd, h, mi, s)
	set AppleScript's text item delimiters to "-"
	set parts to text items of ymd
	set AppleScript's text item delimiters to ""
	set y to item 1 of parts as integer
	set mo to item 2 of parts as integer
	set da to item 3 of parts as integer
	set d to current date
	set year of d to y
	set month of d to mo
	set day of d to da
	set hours of d to h
	set minutes of d to mi
	set seconds of d to s
	return d
end dateFromYMD

on pad2(n)
	set n to n as integer
	if n < 10 then return "0" & n
	return n as string
end pad2

on isoFromDate(d)
	set y to (year of d) as integer
	set m to my pad2(month of d as integer)
	set da to my pad2(day of d)
	set h to my pad2(hours of d)
	set mi to my pad2(minutes of d)
	set se to my pad2(seconds of d)
	return (y as string) & "-" & m & "-" & da & "T" & h & ":" & mi & ":" & se
end isoFromDate

on run argv
	set startYmd to "2021-01-01"
	set endYmd to "2026-12-31"
	set calName to "sowa.progamer@gmail.com"
	set outPath to (POSIX path of (path to temporary items folder)) & "detailing_crm_events.json"
	if (count of argv) ≥ 1 then set startYmd to item 1 of argv as string
	if (count of argv) ≥ 2 then set endYmd to item 2 of argv as string
	if (count of argv) ≥ 3 then
		if (item 3 of argv as string) is not "" then set calName to item 3 of argv as string
	end if
	if (count of argv) ≥ 4 then set outPath to item 4 of argv as string

	set startDate to dateFromYMD(startYmd, 0, 0, 0)
	set endDate to dateFromYMD(endYmd, 23, 59, 59)

	set titles to {}
	set starts to {}
	set ends to {}
	set uids to {}

	with timeout of 1200 seconds
		tell application "Calendar"
			tell calendar calName
				set titles to summary of every event
				set starts to start date of every event
				set ends to end date of every event
				set uids to uid of every event
			end tell
		end tell
	end timeout

	set n to count of titles
	set arr to current application's NSMutableArray's array()

	repeat with i from 1 to n
		set s to item i of starts
		if s ≥ startDate and s ≤ endDate then
			set t to item i of titles
			if t is missing value then set t to ""
			set uidVal to item i of uids
			if uidVal is missing value or uidVal is "" then set uidVal to calName & "|" & i
			set e to item i of ends

			set dict to current application's NSMutableDictionary's dictionary()
			dict's setObject:(uidVal as string) forKey:"event_id"
			dict's setObject:calName forKey:"calendar_name"
			dict's setObject:(t as string) forKey:"title"
			dict's setObject:"" forKey:"notes"
			dict's setObject:(my isoFromDate(s)) forKey:"start_at"
			if e is not missing value then
				dict's setObject:(my isoFromDate(e)) forKey:"end_at"
			end if
			dict's setObject:(current application's NSNumber's numberWithInt:0) forKey:"all_day"
			arr's addObject:dict
		end if
	end repeat

	set jsonData to current application's NSJSONSerialization's dataWithJSONObject:arr options:0 |error|:(missing value)
	if jsonData is missing value then error "NSJSONSerialization failed"
	set jsonStr to current application's NSString's alloc()'s initWithData:jsonData encoding:(current application's NSUTF8StringEncoding)
	set ok to jsonStr's writeToFile:(outPath) atomically:true encoding:(current application's NSUTF8StringEncoding) |error|:(missing value)
	if ok is false then error "Failed to write " & outPath

	return (arr's |count|() as string) & " events written to " & outPath
end run
