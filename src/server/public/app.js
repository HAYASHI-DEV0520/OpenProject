import {
    getCalendars,
    getDestination,
    getDirections,
    getRailways,
    getStations,
    getStatus,
    getTrain,
    getTrains
} from './api.js';
import {
    clearStepControls,
    getSelectedConditions,
    onCalendarChange,
    onLoadStationsClick,
    onRailwayChange,
    renderStepControls,
    resetCalendars,
    resetDirections,
    setBoardingTrains,
    setBoardingTrainsLoading,
    setCalendars,
    setDebug,
    setDirections,
    setLoadStationsDisabled,
    setRailways,
    setResult,
    setRideDetails,
    setRideResult,
    setStatus
} from './ui.js';

let selectedBoardingStation = null;
let selectedTrain = null;
let selectedAlightingStation = null;
let currentStations = [];

async function updateStatus() {
    try {
        const data = await getStatus();
        setStatus(`ロード完了: ${data.records} 件のダイヤを読み込みました。`);
    } catch (err) {
        setStatus(`エラー: ${err.message}`);
    }
}

async function loadRailways() {
    setRailways(await getRailways());
}

async function loadCalendars() {
    const { railway } = getSelectedConditions();
    if (!railway) return;
    setCalendars(await getCalendars(railway));
}

async function loadDirections() {
    const { railway, calendar } = getSelectedConditions();
    if (!railway || !calendar) return;
    setDirections(await getDirections(railway, calendar));
}

async function loadStations() {
    const { railway, calendar, direction } = getSelectedConditions();
    if (!railway || !calendar || !direction) {
        setResult('線路・カレンダー・方向を選択してください。');
        clearStepControls();
        return;
    }

    currentStations = await getStations(railway, calendar, direction);
    const destination = await getDestination(railway, calendar, direction);

    selectedBoardingStation = null;
    selectedTrain = null;
    selectedAlightingStation = null;

    renderStepControls({
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

    setDebug({ currentStations, destination });
}

async function loadTrainsForBoardingStation() {
    setBoardingTrainsLoading();

    if (!selectedBoardingStation) {
        setBoardingTrains([], trainNumber => {
            selectedTrain = trainNumber;
        });
        return;
    }

    const { railway, calendar, direction } = getSelectedConditions();
    const trains = await getTrains(selectedBoardingStation, railway, calendar, direction);
    setBoardingTrains(trains, trainNumber => {
        selectedTrain = trainNumber;
    });
}

async function confirmRide(destination) {
    if (!selectedBoardingStation || !selectedTrain || !selectedAlightingStation) {
        setRideResult('乗車駅、列車、降車駅をすべて選択してください。');
        return;
    }

    if (selectedBoardingStation === selectedAlightingStation) {
        setRideResult('乗車駅と降車駅が同じです。別の駅を選択してください。');
        return;
    }

    const timetable = await getTrain(selectedTrain);
    const boardIndex = timetable.stops.findIndex(stop => stop.station === selectedBoardingStation);
    const alightIndex = timetable.stops.findIndex(stop => stop.station === selectedAlightingStation);

    if (boardIndex === -1 || alightIndex === -1 || alightIndex <= boardIndex) {
        setRideResult('選択した列車は乗車駅から降車駅へ向かいません。別の組み合わせを選択してください。');
        return;
    }

    const boardingTime = timetable.stops[boardIndex].arrivalTime || timetable.stops[boardIndex].departureTime || '不明';
    const alightingTime = timetable.stops[alightIndex].arrivalTime || timetable.stops[alightIndex].departureTime || '不明';

    setRideDetails({
        boardingStation: selectedBoardingStation,
        trainNumber: selectedTrain,
        boardingTime,
        alightingStation: selectedAlightingStation,
        alightingTime
    });
}

onRailwayChange(async () => {
    resetCalendars();
    resetDirections();
    await loadCalendars();
});

onCalendarChange(async () => {
    await loadDirections();
});

onLoadStationsClick(async () => {
    setLoadStationsDisabled(true);
    try {
        await loadStations();
    } catch (err) {
        setResult(`エラー: ${err.message}`);
    } finally {
        setLoadStationsDisabled(false);
    }
});

(async () => {
    await updateStatus();
    resetCalendars();
    resetDirections();
    await loadRailways();
})();
