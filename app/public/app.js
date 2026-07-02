import * as api from './api.js';
import * as ui from './ui.js';
import * as pi from './pi.js';
import * as calendar from './calendar.js';

let boardingStations = [];
let selectedBoardingStation = null;
let selectedTrain = null;
let selectedAlightingStation = null;
let currentStations = [];
let confirmRideRequestId = 0;
let confirmRideTimer = null;

function normalizeLocalizedItem(item) {
    let escapeHtml = (value) => {
        return String(value).replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    }

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

// 手動でローカライズし、{id, nameJa}にする
// マッチしてない場合は元のIDのまま
function localizeCalendar(calendarID) {
    let localizeCalendarID = (id) => {
        const prefix = 'odpt.Calendar:';
        switch(id) {
            case `${prefix}Weekday`: return '平日';
            case `${prefix}Saturday`: return '土曜';
            case `${prefix}Holiday`: return '日曜';
            case `${prefix}SaturdayHoliday`: return '土曜/日曜';
            default: return id;
        }
    };

    return {
        id: calendarID,
        nameJa: localizeCalendarID(calendarID)
    };
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
    let calendars = (await api.getCalendars(railway))
        .map(localizeCalendar)
        .map(normalizeLocalizedItem);

    console.log(calendars);
    ui.setCalendars(calendars);
    return calendars;
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
            ui.autoSelectTrain();
        },
        onAlightingStationChange: async station => {
            selectedAlightingStation = station;
            await maybeConfirmRide();
        },
        onConfirmRide: confirmRide
    });

    ui.appendDebug({ currentStations, destination });
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
    ui.setBoardingTrains(trains, async trainNumber => {
        selectedTrain = trainNumber;
        await maybeConfirmRide();
    });
}

async function maybeConfirmRide() {
    if (!selectedBoardingStation || !selectedTrain || !selectedAlightingStation) return;

    const requestId = ++confirmRideRequestId;
    clearTimeout(confirmRideTimer);
    confirmRideTimer = setTimeout(async () => {
        if (requestId !== confirmRideRequestId) return;
        await confirmRide();
    }, 200);
}

async function confirmRide() {
    if (!selectedBoardingStation || !selectedTrain || !selectedAlightingStation) {
        ui.setRideResult('乗車駅、列車、降車駅をすべて選択してください。');
        return;
    }

    const boardingStation = selectedBoardingStation;
    const trainNumber = selectedTrain;
    const alightingStation = selectedAlightingStation;

    if (boardingStation === alightingStation) {
        ui.setRideResult('乗車駅と降車駅が同じです。別の駅を選択してください。');
        return;
    }

    const timetable = await api.getTrain(trainNumber);
    if (boardingStation !== selectedBoardingStation || trainNumber !== selectedTrain || alightingStation !== selectedAlightingStation) return;

    const boardIndex = timetable.stops.findIndex(stop => stop.station === boardingStation);
    const alightIndex = timetable.stops.findIndex(stop => stop.station === alightingStation);

    if (boardIndex === -1 || alightIndex === -1 || alightIndex <= boardIndex) {
        ui.setRideResult('選択した列車は乗車駅から降車駅へ向かいません。別の組み合わせを選択してください。');
        return;
    }

    const boardingTime = timetable.stops[boardIndex].arrivalTime || timetable.stops[boardIndex].departureTime || '不明';
    const alightingTime = timetable.stops[alightIndex].arrivalTime || timetable.stops[alightIndex].departureTime || '不明';

    ui.setRideDetails({
        boardingStation: stationNameById(boardingStation),
        trainNumber,
        boardingTime,
        alightingStation: stationNameById(alightingStation),
        alightingTime
    });
}

function matchIndexFromCalendars(dateType, calendars) {
    for (const [i, calendar] of calendars.entries()) {
        if (calendar.id.includes(dateType)) return i;
    }
    throw new Error("unrecognized calendar");
}

ui.onRailwayChange(async () => {
    ui.resetCalendars();
    ui.resetDirections();
    const { railway } = ui.getSelectedConditions();
    ui.setConditionControlsVisible(Boolean(railway));
    if (!railway) return;

    let calendars = await loadCalendars();
    console.log(JSON.stringify(calendars));

    // 日にちによってカレンダーを自動選択
    let dateType = calendar.getCurrentCalendarType();
    let index = matchIndexFromCalendars(dateType, calendars);
    ui.selectCalendar(index + 1);

    console.log(dateType);
    console.log("selected: " + calendars[index].id + ", index: " + index);
});
;
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
    ui.setConditionControlsVisible(false);
    await loadRailways();

    await pi.connect((msg) => {
        ui.appendDebug("[relay server receive]" + msg.data);
    });
    ui.appendStatus("web socketリレーサービスに接続しました。");
}

window.addEventListener("load", main);
