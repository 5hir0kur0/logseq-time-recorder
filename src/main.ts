import "@logseq/libs";
import {
  RENDERER_ID,
  RENDERER_PATTERN,
  TimeRecords,
  parseTimeRecords,
  parseTimeRecordsFromBlock,
} from "./time-records.ts";
import {
  SCHEMA as SETTINGS_SCHEMA,
  getSettings,
  onSettingsChanged,
} from "./settings.ts";
import {
  Timestamp,
  currentJournalPageRef,
  formatTimeBetween,
  formatTimeOfDay,
  formatTimestamp,
  timestampNowFormatted,
} from "./dates.ts";

logseq.ready(main).catch((e) => {
  console.error(e);
  logseq.UI.showMsg(`error: ${e}`, "error");
});

async function main() {
  logseq.provideModel({ clockIn, clockOut });

  logseq.provideStyle(``);

  logseq.useSettingsSchema(SETTINGS_SCHEMA);
  logseq.onSettingsChanged(onSettingsChanged);

  logseq.Editor.registerSlashCommand("🕰️ Insert Punch Clock", async () => {
    await logseq.Editor.insertAtEditingCursor(await applyTemplate());
  });

  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
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
      });
    } catch (error) {
      logseq.UI.showMsg(`Error: ${error}`, "error");
    }
  });
}

function timeTableId(slot: string): string {
  return `logseq-time-recorder-${slot}`;
}

async function clockIn({ dataset: { slotId, blockUuid } }) {
  try {
    const block = await logseq.Editor.getBlock(blockUuid);
    if (!block) {
      return;
    }
    const timeRecordsOld = parseTimeRecordsFromBlock(block);
    if (timeRecordsOld.pending) {
      await logseq.UI.showMsg(`Already clocked in!`, "warning");
      return;
    }
    const timeRecords = timeRecordsOld.clockIn();

    const newContent = block?.content?.replace(
      RENDERER_PATTERN,
      `{{renderer ${RENDERER_ID}, ${timeRecords.toString()}}}`,
    );
    if (!newContent) {
      return;
    }
    await logseq.Editor.updateBlock(blockUuid, newContent);
    renderTimer({ slot: slotId, timeRecords, blockUuid });
    await logseq.UI.showMsg(
      `Clocking IN at ${formatTimeOfDay({ ...timeRecords.pending!, format: "short" })}.`,
    );
  } catch (error) {
    await logseq.UI.showMsg(`Error: ${error}`, "error");
  }
}

async function clockOut({ dataset: { slotId, blockUuid } }) {
  try {
    const block = await logseq.Editor.getBlock(blockUuid);
    if (!block) {
      return;
    }
    const timeRecordsOld = parseTimeRecordsFromBlock(block);
    if (!timeRecordsOld.pending) {
      await logseq.UI.showMsg(`Not clocked in!`, "warning");
      return;
    }
    const timeRecords = timeRecordsOld.clockOut();

    const newContent = block?.content?.replace(
      RENDERER_PATTERN,
      `{{renderer ${RENDERER_ID}, ${timeRecords.toString()}}}`,
    );
    if (!newContent) {
      return;
    }
    await logseq.Editor.updateBlock(blockUuid, newContent);
    renderTimer({ slot: slotId, timeRecords, blockUuid });
    await logseq.UI.showMsg(
      `Clocking OUT at ${formatTimeOfDay({ ...timeRecords.lastClockedOutTimestamp!, format: "short" })}.`,
    );
  } catch (error) {
    await logseq.UI.showMsg(`Error: ${error}`, "error");
  }
}

async function renderTimer({
  slot,
  blockUuid,
  timeRecords,
}: {
  slot: string;
  blockUuid: string;
  timeRecords: TimeRecords;
}) {
  function button() {
    return `
      <button
        class="ui__button inline-flex items-center justify-center whitespace-nowrap gap-1 font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none bg-primary/90 hover:bg-primary/100 active:opacity-90 text-primary-foreground hover:text-primary-foreground as-classic h-7 rounded px-3 py-1 text-sm mr-1"
        style="margin-right: 0;"
        data-slot-id="${slot}"
        data-block-uuid="${blockUuid}"
        data-on-click="${timeRecords.pending ? "clockOut" : "clockIn"}">${timeRecords.pending ? "Clock out" : "Clock in"}
      </button>
    `;
  }

  function header() {
    return `
      <tr>
        <th colspan="4">
          <div style="display: flex; justify-content: space-between;">
            <div style="display: flex; align-items: center; font-size: 1.3em; margin-right: 1.5em;">
              Punch Clock
            </div>
            <div>
              ${button()}
            </div>
          </div>
        </th>
      </tr>
    `;
  }

  function row(start: Timestamp, end?: Timestamp): string {
    return `
      <tr>
        <td style="text-align: right;">${formatTimestampHTML(start)}</td>
        <td style="padding-left: 0; padding-right: 0; text-align: center;">–</td>
        <td style="text-align: left">${end ? formatTimestampHTML(end) : '<span style="color: #888;">now</span>'}</td>
        <td style="color: #888;">${formatTimeBetween(start, end)}</td>
      </tr>
    `;
  }

  function body(): string {
    const pending: [Timestamp, undefined][] = [];
    if (timeRecords.pending) {
      pending.push([timeRecords.pending, undefined]);
    }
    return [...timeRecords.timeSlots, ...pending]
      .map(([start, end]) => row(start, end))
      .join("");
  }

  // Table ID is used to check if the slot still exists.
  logseq.provideUI({
    slot,
    reset: true,
    template: `
      <table style="white-space: normal; margin: 0;" id="${timeTableId(slot)}">
        <thead>
          ${header()}
        </thead>
        <tbody>
          ${body()}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">Total:</td> <td style="font-weight: bold;">${timeRecords.totalTime()}</td>
          </tr>
        </tfoot>
      </table>
      `,
  });

  if (timeRecords.pending) {
    setTimeout(async () => {
      // Calling this via `logseq.App.queryElementById` like specified in the documentation does not work.
      // Is this a bug?
      if (await logseq.UI.queryElementById(timeTableId(slot))) {
        // If the table ID still exists, update the timer.
        await renderTimer({ slot, blockUuid, timeRecords });
      } else {
        // If not (e.g. because the block was deleted or the user is editing the block), do nothing.
        console.info("slot", slot, "no longer exists, not updating timer");
      }
    }, 10 * 1000);
  }
}

export function formatTimestampHTML(timestamp: Timestamp): string {
  const formatted = formatTimestamp(timestamp);
  if (timestamp.format === "short") {
    return formatted;
  }
  return formatted.replace(
    /^([^T]+)T(.+)$/,
    (_, date, time) =>
      `<span style="color: #888;">${date}</span>&nbsp;&nbsp;${time}`,
  );
}

function rendererMacro(): string {
  return `{{renderer ${RENDERER_ID}, ${timestampNowFormatted()}}} `;
}

async function applyTemplate(): Promise<string> {
  let template = getSettings().blockTemplate;
  // Make sure {{{time-recorder}}} is always contained in the template.
  if (!template.includes("{{{time-recorder}}}")) {
    template += " {{{time-recorder}}}";
  }
  if (template.includes("{{{today}}}")) {
    template = template.replace("{{{today}}}", await currentJournalPageRef());
  }
  template = template.replace("{{{time-recorder}}}", rendererMacro());
  return template;
}
