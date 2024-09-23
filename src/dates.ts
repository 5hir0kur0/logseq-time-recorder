import { format } from "date-fns";
import { getSettings } from "./settings";

// Date format, e.g.: 2024-05-15T21:12
export const ISO_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const TIME_OF_DAY_FORMAT = /^\d{1,2}:\d{2}$/;

export function dateToISOLocal(date: Date) {
  // https://stackoverflow.com/questions/12413243/javascript-date-format-like-iso-but-local
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const msLocal = date.getTime() - offsetMs;
  const dateLocal = new Date(msLocal);
  const iso = dateLocal.toISOString();
  const isoLocal = iso.split(".")[0];
  // remove seconds
  return isoLocal.slice(0, -3);
}

export function localISOStringToDate(iso: string): Date {
  const match = iso.match(ISO_DATE_FORMAT);
  if (!match) {
    throw `Invalid ISO date format: ${iso}`;
  }
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
  return new Date(Date.parse(iso + ":00"));
}

export function localISODateNow(): string {
  return dateToISOLocal(new Date());
}

// If the user formats timestamps as "HH:MM" they are still stored as dates.
// Thus, to be able to format them properly, we need to know if they are "short" or not.
export type Timestamp = ShortTimestamp | LongTimestamp;
export type TimestampFormat = "short" | "long";

type ShortTimestamp = {
  date: Date;
  format: "short";
};

type LongTimestamp = {
  date: Date;
  format: "long";
};

export function parseTimestamp(input: string): Timestamp {
  if (input.match(ISO_DATE_FORMAT)) {
    return {
      date: localISOStringToDate(input),
      format: "long",
    };
  } else if (input.match(TIME_OF_DAY_FORMAT)) {
    return {
      date: parseTimeOfDay(input),
      format: "short",
    };
  } else {
    throw `Invalid timestamp format: ${input}`;
  }
}

function parseTimeOfDay(input: string): Date {
  const parts = input.split(":").map(Number);
  if (
    parts.length !== 2 ||
    !Number.isInteger(parts[0]) ||
    !Number.isInteger(parts[1])
  ) {
    throw `Invalid time format: "${input}"`;
  }
  const [hours, minutes] = parts;
  if (hours < 0 || hours >= 24 || minutes < 0 || minutes >= 60) {
    throw `Hours or minutes out of range: ${input}`;
  }
  const now = new Date();
  now.setMinutes(minutes);
  now.setHours(hours);
  now.setSeconds(0);
  return now;
}

export function getMinutesBetween(start: Date, end: Date): number {
  const millisecondsPerMinute = 60000;
  const difference = end.getTime() - start.getTime();
  return difference / millisecondsPerMinute;
}

export function incrementTimestampByMinutes(
  stamp: Date,
  minutes: number,
): Date {
  const millisecondsPerMinute = 60000;
  const difference = minutes * millisecondsPerMinute;
  const newTime = stamp.getTime() + difference;
  return new Date(newTime);
}

export function formatTimeOfDay({ date: time }: ShortTimestamp): string {
  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function timestampNow(): Timestamp {
  return {
    date: new Date(),
    format: getSettings().defaultTimestampFormat,
  };
}

export function formatTimestamp(timestamp: Timestamp): string {
  if (timestamp.format === "short") {
    return formatTimeOfDay(timestamp);
  } else {
    return dateToISOLocal(timestamp.date);
  }
}

export function timestampNowFormatted(): string {
  return formatTimestamp(timestampNow());
}

export function formatTime(timeInMinutes: number): string {
  const minutesPerHour = 60;
  if (timeInMinutes > minutesPerHour) {
    const hours = Math.floor(timeInMinutes / minutesPerHour);
    const minutes = timeInMinutes % minutesPerHour;
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
  return `${timeInMinutes}m`;
}

// Returns the time between two timestamps formatted as "Xh Ym".
// If the end timestamp is not provided, the current time is used.
export function formatTimeBetween(start: Timestamp, end?: Timestamp): string {
  const minutes = getMinutesBetween(start.date, end?.date ?? new Date());
  return formatTime(Math.round(minutes));
}

// It would be very nice if Logseq had a way to link to dates that did not depend on the user's preferred date format...
// See discussion here: https://github.com/logseq/logseq/discussions/7933 (store date as ISO 8601, render in user's preferred format).
// Until then, we can use this function to get a reference to the current journal page.
export async function currentJournalPageRef(): Promise<string> {
  // Inspired by logseq-omnivore:
  // https://github.com/omnivore-app/logseq-omnivore/blob/1c5a965dba55b70ffbbb821eeab71f9f538958b0/src/util.ts
  const userConfigs = await logseq.App.getUserConfigs();
  const preferredDateFormat: string = userConfigs.preferredDateFormat;
  const formatDate = (date: Date, preferredDateFormat: string): string => {
    return format(date, preferredDateFormat, {
      // Use YY and YYYY for the year instead of for week-numbering.
      useAdditionalDayOfYearTokens: true,
      useAdditionalWeekYearTokens: true,
    });
  };
  const dateReference = (date: Date, preferredDateFormat: string): string => {
    return `[[${formatDate(date, preferredDateFormat)}]]`;
  };
  return dateReference(new Date(), preferredDateFormat);
}
