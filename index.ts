import '@logseq/libs'
import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user';

const RENDERER_ID = ':time-recorder'
const RENDERER_PATTERN = /\{\{renderer\s+:time-recorder\s*,\s*([^}]*)\}\}/gm;

type TimeRecords = {
  timeSlots: Array<[Date, Date]>,
  pending?: Date,
};

async function main() {
  logseq.provideModel({
    async clockIn(e: any) {
      const now = new Date();
      logseq.UI.showMsg(`Clocking IN at ${formatTimeOfDay(now)}.`);

      const { slotId, blockUuid } = e.dataset;

      try {
        const block = await logseq.Editor.getBlock(blockUuid);
        const timeRecords = parseTimeRecordsFromBlock(block);
        if (timeRecords.pending) {
          logseq.UI.showMsg(`Already clocked in!`, 'warning');
          return;
        }
        timeRecords.pending = now;

        const newContent = block?.content?.replace(RENDERER_PATTERN, `{{renderer ${RENDERER_ID}, ${formatTimeRecords(timeRecords)}}}`);
        if (!newContent) {
          return;
        }
        await logseq.Editor.updateBlock(blockUuid, newContent);
        renderTimer({ slot: slotId, timeRecords, blockUuid, init: false });
      } catch (error) {
        logseq.UI.showMsg(`Error: ${error}`, 'error');
      }
    },
    async clockOut(e: any) {
      const now = new Date();
      logseq.UI.showMsg(`Clocking OUT at ${formatTimeOfDay(now)}.`);

      const { slotId, blockUuid } = e.dataset;

      try {
        const block = await logseq.Editor.getBlock(blockUuid);
        const timeRecords = parseTimeRecordsFromBlock(block);
        if (!timeRecords.pending) {
          logseq.UI.showMsg(`Not clocked in!`, 'warning');
          return;
        }
        timeRecords.timeSlots.push([timeRecords.pending, now]);
        timeRecords.pending = undefined;

        const newContent = block?.content?.replace(RENDERER_PATTERN, `{{renderer ${RENDERER_ID}, ${formatTimeRecords(timeRecords)}}}`);
        if (!newContent) {
          return;
        }
        await logseq.Editor.updateBlock(blockUuid, newContent);
        renderTimer({ slot: slotId, timeRecords, blockUuid, init: false });
      } catch (error) {
        logseq.UI.showMsg(`Error: ${error}`, 'error');
      }
    },
  })

  // button from: https://getcssscan.com/css-buttons-examples
  logseq.provideStyle(`
    .time_recorder_button {
      background-color: rgba(51, 51, 51, 0.05);
      border-radius: 8px;
      border-width: 0;
      color: #333333;
      display: inline-block;
      font-weight: 500;
      padding: 10px 12px;
      text-align: center;
      transition: all 200ms;
      white-space: nowrap;
    }
  `)

  logseq.Editor.registerSlashCommand('🕰️ Insert Time Recorder', async () => {
    await logseq.Editor.insertAtEditingCursor(
      `{{renderer ${RENDERER_ID}, ${currentTimeOfDay()}}} `,
    )
  })

  function renderTimer({
    slot, blockUuid, timeRecords, init
  }: { slot: string, blockUuid: string, timeRecords: TimeRecords, init: boolean }) {
    const key = timerUiKey(blockUuid);

    logseq.provideUI({
      key,
      slot,
      reset: init,
      template: `
      <table>
        <tr><th colspan="2" style="font-weight: bold; text-align: center; font-size: 1.1em;">Time Recorder</th></tr>
        <tr><td>Time Slots:</td> <td>${formatTimeRecords(timeRecords)}</td></tr>
        <tr><td>Total:</td> <td>${formatTotalTime(timeRecords)}</td></tr>
        <tr><td colspan="2" style="text-align: center">
          <button
            class="time_recorder_button"
            data-slot-id="${slot}" 
            data-block-uuid="${blockUuid}"
            data-on-click="${timeRecords.pending ? 'clockOut' : 'clockIn'}">
            ${timeRecords.pending ? 'Clock OUT' : 'Clock IN'}
          </button>
        </td></tr>
      </table>
      `,
    });

    setTimeout(() => {
      renderTimer({ slot, blockUuid, timeRecords, init: false })
    }, 30 * 1000)
  }

  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const rendererID = payload.arguments[0];
    if (rendererID !== RENDERER_ID) {
      return;
    }

    try {
      const timeRecords = parseTimeRecords(payload.arguments.slice(1));
      renderTimer({
        blockUuid: payload.uuid,
        slot,
        timeRecords,
        init: payload.arguments.length === 1
      });
    } catch (error) {
      logseq.UI.showMsg(`Error: ${error}`, 'error');
    }
  })
}

function formatTimeOfDay(time: Date): string {
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatTimeRecords(timeRecords: TimeRecords): string {
  let result = timeRecords.timeSlots.map((times) => `${formatTimeOfDay(times[0])} - ${formatTimeOfDay(times[1])}`).join(',  ');
  if (timeRecords.pending) {
    result = `${result}, ${formatTimeOfDay(timeRecords.pending)} -`
  }
  return result;
}

function timerUiKey(uuid: string): string {
  return `timer-ui-${uuid}`
}

function currentTimeOfDay(): string {
  return formatTimeOfDay(new Date());
}

function parseTimeOfDay(input: string): Date {
  const parts = input.split(':').map(Number);
  if (parts.length !== 2 || !Number.isInteger(parts[0]) || !Number.isInteger(parts[1])) {
    throw `Invalid time format: "${input}"`;
  }
  const [hours, minutes] = parts;
  if (hours < 0 || hours >= 24 || minutes < 0 || minutes >= 60) {
    throw `Hours or minutes out of range: ${input}`;
  }
  const now = new Date();
  now.setMinutes(minutes);
  now.setHours(hours);
  return now;
}

function parseTimeRecords(inputStrings: string[]): TimeRecords {
  const timeSlots: Array<[Date, Date]> = [];
  let pending: Date | undefined;
  for (let i = 0; i < inputStrings.length; i++) {
    const inputStr = inputStrings[i];
    const parts = inputStr.split('-').map(part => part.trim());
    if (parts.length > 2) {
      throw `invalid time slot: ${inputStr}`;
    }
    if (parts.length == 2 && !parts[1]) {
      // delete the second part if e.g. the string was "HH:MM - ".
      parts.pop();
    }
    const isPending = parts.length === 1;
    if (isPending) {
      const last = i === (inputStrings.length - 1);
      if (!last) {
        throw `Invalid time record: second part missing from ${inputStr}.`;
      }
      pending = parseTimeOfDay(parts[0]);
    } else {
      timeSlots.push([parseTimeOfDay(parts[0]), parseTimeOfDay(parts[1])]);
    }
  }

  return { timeSlots, pending };
}

function parseTimeRecordsFromBlock(block: BlockEntity | null): TimeRecords {
  const matches = block?.content.matchAll(RENDERER_PATTERN);
  if (!matches) {
    throw `Failed to parse block content: ${block?.content}`;
  }
  const matchesArray = [...matches];
  if (matchesArray.length === 0) {
    throw `No renderer found in: ${block?.content}`;
  }
  if (matchesArray.length !== 1) {
    throw `There must be at most one renderer in a block: ${block?.content}`;
  }
  const match = matchesArray[0];
  if (!match || match.length < 2) {
    throw `Invalid renderer syntax: ${block?.content}`;
  }
  const args = match[1];
  return parseTimeRecords(args.split(',').map(a => a.trim()));
}

function getMinutesBetween(start: Date, end: Date): number {
  const millisecondsPerMinute = 60000;
  const difference = end.getTime() - start.getTime();
  return Math.round(difference / millisecondsPerMinute);
}

function calculateTotalTime(timeRecords: TimeRecords): number {
  let total = 0;
  for (const [start, end] of timeRecords.timeSlots) {
    total += getMinutesBetween(start, end);
  }
  if (timeRecords.pending) {
    total += getMinutesBetween(timeRecords.pending, new Date());
  }
  return total;
}

function formatTime(timeInMinutes: number): string {
  const minutesPerHour = 60;
  if (timeInMinutes > minutesPerHour) {
    const hours = Math.floor(timeInMinutes / minutesPerHour);
    const minutes = timeInMinutes % minutesPerHour;
    const minutesStr = minutes.toString().padStart(2, '0');
    const hoursStr = hours.toString().padStart(2, '0');
    return `${hoursStr}h ${minutesStr}m`
  }
  return `${timeInMinutes}m`
}

function formatTotalTime(timeRecords: TimeRecords): string {
  return formatTime(calculateTotalTime(timeRecords));
}

logseq.ready(main).catch((e) => {
  console.error(e);
  logseq.UI.showMsg(`error: ${e}`, 'error');
})
