const JAPAN_TIME_ZONE = 'Asia/Tokyo';

function getJapanDateParts(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: JAPAN_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
    }).formatToParts(date);

    return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function nthMonday(year, month, nth) {
    const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const firstMonday = 1 + ((8 - firstDay) % 7);
    return firstMonday + (nth - 1) * 7;
}

function getJapanEquinoxDay(year, spring) {
    const base = spring ? 20.8431 : 23.2488;
    return Math.floor(base + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function toDateKey(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getJapanHolidayKeys(year) {
    const holidays = new Set([
        toDateKey(year, 1, 1),
        toDateKey(year, 1, nthMonday(year, 1, 2)),
        toDateKey(year, 2, 11),
        toDateKey(year, 2, 23),
        toDateKey(year, 3, getJapanEquinoxDay(year, true)),
        toDateKey(year, 4, 29),
        toDateKey(year, 5, 3),
        toDateKey(year, 5, 4),
        toDateKey(year, 5, 5),
        toDateKey(year, 7, nthMonday(year, 7, 3)),
        toDateKey(year, 8, 11),
        toDateKey(year, 9, nthMonday(year, 9, 3)),
        toDateKey(year, 9, getJapanEquinoxDay(year, false)),
        toDateKey(year, 10, nthMonday(year, 10, 2)),
        toDateKey(year, 11, 3),
        toDateKey(year, 11, 23)
    ]);

    const sorted = [...holidays].sort();
    sorted.forEach(key => {
        const date = new Date(`${key}T00:00:00Z`);
        if (date.getUTCDay() !== 0) return;

        do {
            date.setUTCDate(date.getUTCDate() + 1);
        } while (holidays.has(toDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())));
        holidays.add(toDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()));
    });

    for (let month = 1; month <= 12; month += 1) {
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
        for (let day = 2; day < daysInMonth; day += 1) {
            const previous = toDateKey(year, month, day - 1);
            const current = toDateKey(year, month, day);
            const next = toDateKey(year, month, day + 1);
            if (!holidays.has(current) && holidays.has(previous) && holidays.has(next)) {
                holidays.add(current);
            }
        }
    }
    return holidays;
}

/* JAPAN_TIME_ZONEから現在日にちによって'Weekday' | 'Saturday' | 'Holiday'を返す */
export function getCurrentCalendarType(date = new Date()) {
    const parts = getJapanDateParts(date);
    const dateKey = toDateKey(Number(parts.year), Number(parts.month), Number(parts.day));

    if (parts.weekday === 'Sat') return 'Saturday';
    if (parts.weekday === 'Sun' || getJapanHolidayKeys(Number(parts.year)).has(dateKey)) return 'Holiday';
    return 'Weekday';
}
