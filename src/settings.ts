import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";
import { TimestampFormat } from "./dates";

export type Settings = {
  defaultTimestampFormat: TimestampFormat;
};

let settings: Settings = {
  defaultTimestampFormat: "long",
};

export const SCHEMA: SettingSchemaDesc[] = [
  {
    key: "defaultTimestampFormat",
    default: settings.defaultTimestampFormat,
    description:
      "Whether to use short (HH:MM) or long (ISO) timestamps by default.",
    title: "Default Timestamp Format",
    type: "enum",
    enumPicker: "radio",
    enumChoices: ["short", "long"],
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
