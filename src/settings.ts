import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";
import { TimestampFormat } from "./dates";

export type Settings = {
  defaultTimestampFormat: TimestampFormat;
  blockTemplate: string;
};

let settings: Settings = {
  defaultTimestampFormat: "long",
  blockTemplate: "{{{punch-clock}}}",
};

export const SCHEMA: SettingSchemaDesc[] = [
  {
    key: "defaultTimestampFormat",
    default: settings.defaultTimestampFormat,
    description:
      "Whether to use short (HH:MM) or long (ISO) timestamps by default. Set to 'long' to track time across multiple days.",
    title: "Default Timestamp Format",
    type: "enum",
    enumPicker: "radio",
    enumChoices: ["short", "long"],
  },
  {
    key: "blockTemplate",
    default: settings.blockTemplate,
    description:
      "The template to use when inserting a new time recorder block.\
      Use `{{{punch-clock}}}` to insert the time recorder. Use `{{{today}}}` to insert a link to today's journal.",
    title: "Time Recorder Block Template",
    type: "string",
    inputAs: "textarea",
  },
];

export const onSettingsChanged = (newSettings: Settings) => {
  console.log("Settings changed", newSettings);
  settings = newSettings;
};

export const getSettings = () => assertValid(settings);

function assertValid(settings: Settings): Settings {
  if (
    settings.defaultTimestampFormat !== "short" &&
    settings.defaultTimestampFormat !== "long"
  ) {
    throw "Invalid settings: defaultTimestampFormat is required";
  }
  return settings;
}
