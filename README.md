# Logseq Time Recorder

This plugin can be used for tracking working hours.
Logseq has a built-in functionality to track the time spent on a `TODO` block. However, it is not possible to edit this information (e.g., if you forgot to change the state from `TODO` to `DOING` when you started working on a task).

## Demo

![Demo GIF](https://github.com/5hir0kur0/logseq-time-recorder/assets/12101162/ac7ff04e-dda5-4c71-ae22-667945946a40)

## Features

- Track your working hours during a workday.
- Button to clock in and clock out.
- Times are also manually editable.

## Future Goals

- Ideally I would like this to integrate with the built-in `:LOGBOOK:` syntax that is used for `TODO` blocks, but I don't know how to this with a plugin. It would be even better if Logseq just provided some UI for editing the `:LOGBOOK:`, then this plugin would be obsolete.
- Maybe make it work across days (currently it only records HH:MM timestamps).

## Building and Running the Plugin

- `yarn && yarn build` in terminal to install dependencies.
- `Load unpacked plugin` in Logseq Desktop client.

## Thanks

- Icon: <a href="https://www.flaticon.com/free-icons/punch-clock" title="punch clock icons">Punch clock icons created by Freepik - Flaticon</a>
- The code is heavily inspired by the `logseq-pomodoro-timer` from [logseq-plugin-samples](https://github.com/logseq/logseq-plugin-samples).
