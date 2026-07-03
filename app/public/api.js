const API_BASE = '/api';

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
    }
    return res.json();
}

function buildUrl(path, params = {}) {
    const url = new URL(`${API_BASE}${path}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });
    return url;
}

export function getStatus() {
    return fetchJson(buildUrl('/status'));
}

export function getRailways() {
    return fetchJson(buildUrl('/railways'));
}

export function getCalendars(railway) {
    return fetchJson(buildUrl('/calendars', { railway }));
}

export function getDirections(railway, calendar) {
    return fetchJson(buildUrl('/directions', { railway, calendar }));
}

export function getStations(railway, calendar, direction) {
    return fetchJson(buildUrl('/stations', { railway, calendar, direction }));
}

export function getDestination(railway, calendar, direction) {
    return fetchJson(buildUrl('/destination', { railway, calendar, direction }));
}

export function getTrains(station, railway, calendar, direction) {
    return fetchJson(buildUrl('/trains', { station, railway, calendar, direction }));
}

export function getTrain(trainId) {
    return fetchJson(buildUrl('/train', { trainId }));
}

export function getTrainArrival(trainId, station) {
    return fetchJson(buildUrl('/trainArrival', { trainId, station }));
}
