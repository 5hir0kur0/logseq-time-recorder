import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import {
  Timestamp,
  formatTime,
  formatTimestamp,
  getMinutesBetween,
  incrementTimestampByMinutes,
  parseTimestamp,
  timestampNow,
} from "./dates";

export const RENDERER_ID = ":time-recorder";
export const RENDERER_PATTERN =
  /\{\{renderer\s+:time-recorder\s*(?:,\s*([^}]*))?\}\}/gm;

export class TimeRecords {
  constructor(
    public readonly timeSlots: Array<[Timestamp, Timestamp]>,
    public readonly pending?: Timestamp,
    public goalMinutes?: number,
  ) {}

  toString(): string {
    const timeSlots = this.timeSlots.map(
      (times) => `${formatTimestamp(times[0])} - ${formatTimestamp(times[1])}`,
    );
    const pending = this.pending ? [`${formatTimestamp(this.pending)} -`] : [];
    const goal = this.goalMinutes ? [`goal: ${this.goalMinutes}`] : [];
    return [...goal, ...timeSlots, ...pending].join(", ");
  }

  totalMinutes(): number {
    let total = 0;
    for (const [start, end] of this.timeSlots) {
      total += getMinutesBetween(start.date, end.date);
    }
    if (this.pending) {
      total += getMinutesBetween(this.pending.date, new Date());
    }
    return Math.round(total);
  }

  totalTime(): string {
    return formatTime(this.totalMinutes());
  }

  goalRemainingMinutes(): string {
    const remainingMinutes = (this.goalMinutes ? this.goalMinutes : 0) - this.totalMinutes()
    return formatTime(remainingMinutes)
  }

  goalETATime(): string {
    const remainingMinutes = (this.goalMinutes ? this.goalMinutes : 0) - this.totalMinutes()
    let format : "short" | "long" = "short"
    if (remainingMinutes > 60*15) {
      format = "long"
    }
    return formatTimestamp({date: incrementTimestampByMinutes(timestampNow().date, remainingMinutes), format: format})
  }

  addTimeSlot(start: Timestamp, end: Timestamp): TimeRecords {
    if (end.date.getTime() < start.date.getTime()) {
      throw `End time is before start time: ${formatTimestamp(end)} is before ${formatTimestamp(start)}.`;
    }
    return new TimeRecords([...this.timeSlots, [start, end]], this.pending, this.goalMinutes);
  }

  setPending(pending: Timestamp): TimeRecords {
    return new TimeRecords(this.timeSlots, pending, this.goalMinutes);
  }

  resetPending(): TimeRecords {
    return new TimeRecords(this.timeSlots, undefined, this.goalMinutes);
  }

  clockIn(): TimeRecords {
    if (this.pending) {
      throw `Already clocked in!`;
    }
    return this.setPending(timestampNow());
  }

  clockOut(): TimeRecords {
    if (!this.pending) {
      throw `Not clocked in!`;
    }
    const now = timestampNow();
    return this.resetPending().addTimeSlot(this.pending, now);
  }

  get lastClockedOutTimestamp(): Timestamp | undefined {
    return this.timeSlots[this.timeSlots.length - 1][1];
  }
}

export function parseTimeRecordsFromBlock(block: BlockEntity): TimeRecords {
  const matches = block?.content.matchAll(RENDERER_PATTERN);
  if (!matches) {
    throw `Failed to parse block content: ${block?.content}`;
  }
  const matchesArray = [...matches];
  if (matchesArray.length !== 1) {
    throw `There must be exactly one renderer: ${block?.content}`;
  }
  const match = matchesArray[0];
  if (!match || match.length < 2) {
    throw `Invalid renderer syntax: ${block?.content}`;
  }

  const directives = match[1]?.split(",").map((a) => a.trim()) || [];
  return parseTimeRecords(directives);
}

function findTimestampStrings(input: string): string[] {
  // Need to make sure we don't split at the `-` within ISO timestamps.
  // The regex relies on the fact that in both formats, the timestamp ends with (H)H:MM.
  return input.split(/(?<=\d:\d{2})\s*-/).map((part) => part.trim());
}

function parseTimeRecordsFromTimestamps(inputStrings: string[]): TimeRecords {
  const timeSlots: Array<[Timestamp, Timestamp]> = [];
  let pending: Timestamp | undefined = undefined;
  for (let i = 0; i < inputStrings.length; i++) {
    const inputStr = inputStrings[i];
    const parts = findTimestampStrings(inputStr);
    if (parts.length > 2) {
      throw `invalid time slot: ${inputStr}`;
    }
    if (parts.length == 2 && !parts[1]) {
      // delete the second part if e.g. the string was "HH:MM - ".
      parts.pop();
    }
    const isPending = parts.length === 1;
    if (isPending) {
      const last = i === inputStrings.length - 1;
      if (!last) {
        throw `Invalid time record: second part missing from ${inputStr}.`;
      }
      pending = parseTimestamp(parts[0]);
    } else {
      const start = parseTimestamp(parts[0]);
      const end = parseTimestamp(parts[1]);
      if (end.date.getTime() < start.date.getTime()) {
        throw `End time is before start time: ${inputStr}.`;
      }
      timeSlots.push([start, end]);
    }
  }

  return new TimeRecords(timeSlots, pending, undefined);
}


export function parseTimeRecords(inputStrings: string[]): TimeRecords {
  const timeRecordsStrArray = inputStrings.filter((a: String) => a.includes('-'))
  const timeRecordsObject = parseTimeRecordsFromTimestamps(timeRecordsStrArray);

  const goalDirectives: String[] = inputStrings.filter((a:String) => a.startsWith('goal:'))
  if (goalDirectives.length > 0) {
    timeRecordsObject.goalMinutes = parseInt(goalDirectives[0].substring(5).trim(), 10)
  }
  return timeRecordsObject
}
