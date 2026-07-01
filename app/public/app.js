import * as api from './api.js';
import * as ui from './ui.js';
import * as pi from './pi.js';

let boardingStations = [];
let selectedBoardingStation = null;
let selectedTrain = null;
let selectedAlightingStation = null;
let currentStations = [];

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}

function normalizeLocalizedItem(item) {
    if (typeof item === 'string') {
        const safe = escapeHtml(item);
        return { id: safe, nameJa: safe };
    }

    const id = item?.id ?? '';
    const nameJa = item?.nameJa ?? item?.id ?? '';

    return {
        id: escapeHtml(id),
        nameJa: escapeHtml(nameJa)
    };
}

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
    }
    return res.json();
}

async function updateStatus() {
    try {
        const data = await api.getStatus();
        ui.appendStatus(`ロード完了: ${data.records} 件のダイヤを読み込みました。`);
    } catch (err) {
        ui.appendStatus(`エラー: ${err.message}`);
    }
}

async function loadRailways() {
    ui.setRailways((await api.getRailways()).map(normalizeLocalizedItem));
}

async function loadCalendars() {
    const { railway } = ui.getSelectedConditions();
    if (!railway) return;
    ui.setCalendars((await api.getCalendars(railway)).map(normalizeLocalizedItem));
}

async function loadDirections() {
    const { railway, calendar } = ui.getSelectedConditions();
    if (!railway || !calendar) return;
    ui.setDirections((await api.getDirections(railway, calendar)).map(normalizeLocalizedItem));
}


function stationNameById(stationId) {
  const station = currentStations.find(s => s.id === stationId);
  return station ? station.nameJa : stationId;
}

async function loadStations() {
    const { railway, calendar, direction } = ui.getSelectedConditions();
    if (!railway || !calendar || !direction) {
        ui.setResult('線路・カレンダー・方向を選択してください。');
        ui.clearStepControls();
        return;
    }

    currentStations = (await api.getStations(railway, calendar, direction)).map(normalizeLocalizedItem);
    const destination = normalizeLocalizedItem(await api.getDestination(railway, calendar, direction));

    selectedBoardingStation = null;
    selectedTrain = null;
    selectedAlightingStation = null;

    ui.renderStepControls({
        stations: currentStations,
        destination,
        onBoardingStationChange: async station => {
            selectedBoardingStation = station;
            selectedTrain = null;
            await loadTrainsForBoardingStation();
        },
        onAlightingStationChange: station => {
            selectedAlightingStation = station;
        },
        onConfirmRide: confirmRide
    });

    ui.setDebug({ currentStations, destination });
}

async function loadTrainsForBoardingStation() {
    ui.setBoardingTrainsLoading();

    if (!selectedBoardingStation) {
        ui.setBoardingTrains([], trainNumber => {
            selectedTrain = trainNumber;
        });
        return;
    }

    const { railway, calendar, direction } = ui.getSelectedConditions();
    const trains = await api.getTrains(selectedBoardingStation, railway, calendar, direction);
    ui.setBoardingTrains(trains, trainNumber => {
        selectedTrain = trainNumber;
    });
}

async function confirmRide() {
    if (!selectedBoardingStation || !selectedTrain || !selectedAlightingStation) {
        ui.setRideResult('乗車駅、列車、降車駅をすべて選択してください。');
        return;
    }

    if (selectedBoardingStation === selectedAlightingStation) {
        ui.setRideResult('乗車駅と降車駅が同じです。別の駅を選択してください。');
        return;
    }

    const timetable = await api.getTrain(selectedTrain);
    const boardIndex = timetable.stops.findIndex(stop => stop.station === selectedBoardingStation);
    const alightIndex = timetable.stops.findIndex(stop => stop.station === selectedAlightingStation);

    if (boardIndex === -1 || alightIndex === -1 || alightIndex <= boardIndex) {
        ui.setRideResult('選択した列車は乗車駅から降車駅へ向かいません。別の組み合わせを選択してください。');
        return;
    }

    const boardingTime = timetable.stops[boardIndex].arrivalTime || timetable.stops[boardIndex].departureTime || '不明';
    const alightingTime = timetable.stops[alightIndex].arrivalTime || timetable.stops[alightIndex].departureTime || '不明';

    ui.setRideDetails({
        boardingStation: stationNameById(selectedBoardingStation),
        trainNumber: selectedTrain,
        boardingTime,
        alightingStation: stationNameById(selectedAlightingStation),
        alightingTime
    });
}

ui.onRailwayChange(async () => {
    ui.resetCalendars();
    ui.resetDirections();
    await loadCalendars();
});

ui.onCalendarChange(async () => {
    await loadDirections();
});

ui.onLoadStationsClick(async () => {
    ui.setLoadStationsDisabled(true);
    try {
        await loadStations();
    } catch (err) {
        ui.setResult(`エラー: ${err.message}`);
    } finally {
        ui.setLoadStationsDisabled(false);
    }
});

async function main() {
    await updateStatus();
    ui.resetCalendars();
    ui.resetDirections();
    await loadRailways();

    await pi.connect((msg) => {
        ui.setDebug("[relay server receive]" + msg.data);
    });
    ui.appendStatus("web socketリレーサービスに接続しました。");


}

window.addEventListener("load", main);
