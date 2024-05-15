// Date format, e.g.: 2024-05-15T21:12:32
export const ISO_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

export function dateToISOLocal(date: Date) {
    // https://stackoverflow.com/questions/12413243/javascript-date-format-like-iso-but-local
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const msLocal =  date.getTime() - offsetMs;
    const dateLocal = new Date(msLocal);
    const iso = dateLocal.toISOString();
    const isoLocal = iso.split('.')[0];
    return isoLocal;
}

export function localISOToDate(iso: string): Date {
    const match = iso.match(ISO_DATE_FORMAT);
    if (!match) {
        throw `Invalid ISO date format: ${iso}`;
    }
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
    return new Date(Date.parse(iso));
}

export function localISODateNow(): string {
    return dateToISOLocal(new Date());
}
