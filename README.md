# Logseq Punch Clock

This is a simple plugin for tracking working hours.
Logseq has a built-in feature to track the time spent `DOING` a `TODO` block. However, it is not possible to edit this information (e.g., if you forgot to change the state from `TODO` to `DOING` when you started working on a task) from _within_ Logseq.

## Demo

<img src="https://github.com/ruzito/logseq-punch-clock/assets/12101162/8d1cf67a-9ab7-49d0-a321-22b8bb83ac98" width="700" alt="Demo GIF">

## Features

- Track your working hours during a workday.
- Track working hours across multiple days using the `long` date format.
- Button to clock in and clock out.
- The recorded times are also manually editable.

## Screenshots

Short Date Format:<br>
<img src="https://github.com/ruzito/logseq-punch-clock/assets/12101162/5fd24002-7c37-45a0-b5b9-5bd646230468" width="260" alt="Short Date Format" title="Short Date Format">

Long Date Format:<br>
<img src="https://github.com/ruzito/logseq-punch-clock/assets/12101162/b6ccfb9b-9179-4770-96bc-9a02b0ad4651" width="380" alt="Long Date Format" title="Long Date Format">

Settings:<br>
<img src="https://github.com/ruzito/logseq-punch-clock/assets/12101162/12c9c515-6175-4e77-8313-edc64427ff95" width="500" alt="Settings" title="Settings">


## Future Goals

- Ideally I would like this to integrate with the built-in `:LOGBOOK:` syntax that is used for `TODO` blocks, but I don't know how to this with a plugin. It would be even better if Logseq just provided some UI for editing the `:LOGBOOK:`, then this plugin would be obsolete.
- Maybe make it work across days (currently it only records HH:MM timestamps).

I am not a web developer. If you know how to make the code nicer or the UI prettier, please submit a PR :-)

## Building and Running the Plugin

- `npm install && npm run build` in terminal to install dependencies.
- `Load unpacked plugin` in Logseq Desktop client.

## Thanks

- Logo: <a href="https://www.flaticon.com/free-icons/punch-clock" title="punch clock icons">Punch clock icons created by Freepik - Flaticon</a>
- The code is heavily inspired by the `logseq-pomodoro-timer` from [logseq-plugin-samples](https://github.com/logseq/logseq-plugin-samples).
