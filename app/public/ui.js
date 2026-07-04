const elements = {
    status: document.getElementById('status'),
    statusToast: document.getElementById('statusToast'),
    statusLog: document.getElementById('statusLog'),
    alightingTimeOffsetMinutesInput: document.getElementById('alightingTimeOffsetMinutesInput'),
    railway: document.getElementById('railway'),
    conditionControls: document.getElementById('conditionControls'),
    calendar: document.getElementById('calendar'),
    direction: document.getElementById('direction'),
    loadStations: document.getElementById('loadStations'),
    result: document.getElementById('result'),
    stepControls: document.getElementById('stepControls')
};

class LogBuffer {
    #logs = [];
    #capacity;

    constructor(capacity) {
        this.#capacity = capacity;
    }

    push(message) {
        this.#logs.push(message);

        if (this.#logs.length > this.#capacity) {
            this.#logs.shift();
        }
    }

    clear() {
        this.#logs.length = 0;
    }

    get size() {
        return this.#logs.length;
    }

    toArray() {
        return [...this.#logs];
    }

    [Symbol.iterator]() {
        return this.#logs[Symbol.iterator]();
    }
}

const statusLog = new LogBuffer(10);
const debugLog = new LogBuffer(10);
let statusToastTimer = null;

function formatDebugData(data) {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

function setSelectOptions(select, placeholder, values, toID, toLabel) {
    if (select.dataset.autoSelectionBound !== 'true') {
        select.addEventListener('change', clearAutoSelectionOnManualChange);
        select.dataset.autoSelectionBound = 'true';
    }
    clearAutoSelection(select);
    select.replaceChildren();
    select.append(new Option(placeholder, ''));
    if(!toID){
        values.forEach(value => select.append(new Option(value.nameJa, value.id)));
    } else {
        values.forEach(value => select.append(new Option(toLabel(value), toID(value))));
    }
}

function clearAutoSelection(select) {
    select.classList.remove('auto-selected');
    [...select.options]
        .filter(option => option.dataset.auto === 'true')
        .forEach(option => option.remove());
}

function selectAutoOption(select, index) {
    const selectedOption = select.options[index];
    if (!selectedOption || !selectedOption.value) return false;

    clearAutoSelection(select);

    const autoOption = new Option(
        `自動(${selectedOption.textContent})`,
        selectedOption.value
    );
    autoOption.dataset.auto = 'true';
    select.append(autoOption);
    select.value = autoOption.value;
    autoOption.selected = true;
    select.classList.add('auto-selected');
    select.dispatchEvent(new Event('change'));
    return true;
}

function clearAutoSelectionOnManualChange(event) {
    const selectedOption = event.target.selectedOptions[0];
    if (selectedOption?.dataset.auto === 'true') return;
    clearAutoSelection(event.target);
}

function showStatusToast(message) {
    elements.statusToast.textContent = message;
    elements.statusToast.classList.remove('is-visible');
    clearTimeout(statusToastTimer);

    requestAnimationFrame(() => {
        elements.statusToast.classList.add('is-visible');
        statusToastTimer = setTimeout(() => {
            elements.statusToast.classList.remove('is-visible');
        }, 2400);
    });
}

export function getSelectedConditions() {
    return {
        railway: elements.railway.value,
        calendar: elements.calendar.value,
        direction: elements.direction.value
    };
}

export function appendStatus(message) {
    statusLog.push(message);
    elements.statusLog.innerHTML = statusLog
        .toArray()
        .reverse()
        .map(log => `<div>[${new Date().toLocaleTimeString()}] ${log}</div>`)
        .join("");
    elements.status.textContent = message;
    showStatusToast(message);
}


export function setRailways(railways) {
    setSelectOptions(elements.railway, '線路を選択', railways);
}

export function setCalendars(calendars) {
    setSelectOptions(elements.calendar, 'カレンダーを選択', calendars);
}

export function resetCalendars() {
    setSelectOptions(elements.calendar, 'カレンダーを選択', []);
}

export function setConditionControlsVisible(visible) {
    elements.conditionControls.hidden = !visible;
}

export function setDirections(directions) {
    setSelectOptions(elements.direction, '方向を選択', directions);
}

export function resetDirections() {
    setSelectOptions(elements.direction, '方向を選択', []);
}

export function setResult(message) {
    elements.result.replaceChildren();
    const p = document.createElement('p');
    p.textContent = message;
    elements.result.append(p);
}

export function clearStepControls() {
    elements.stepControls.replaceChildren();
}


export function setLoadStationsDisabled(disabled) {
    elements.loadStations.disabled = disabled;
}

export function renderStepControls({ stations, onBoardingStationChange, onAlightingStationChange }) {
    elements.stepControls.innerHTML = `
<div class="row">
    <div>
        <label for="boardingStation">乗車駅</label>
        <select id="boardingStation"></select>
    </div>
    <div>
        <label for="alightingStation">降車駅</label>
        <select id="alightingStation"></select>
    </div>
    <div>
        <label for="trainByTime">乗車時間で列車を選択</label>
        <select id="trainByTime"></select>
    </div>
</div>
<div id="rideResult"></div>
`;

    const boardingStation = document.getElementById('boardingStation');
    const trainByTime = document.getElementById('trainByTime');
    const alightingStation = document.getElementById('alightingStation');

    setSelectOptions(boardingStation, '乗車駅を選択', stations);
    setSelectOptions(trainByTime, '列車を選択', []);
    setSelectOptions(alightingStation, '降車駅を選択', stations);

    boardingStation.addEventListener('change', event => {
        const selectedId = event.target.value;
        const boardingIndex = stations.findIndex(s => s.id === selectedId);
        const availableStations = boardingIndex >= 0
            ? stations.slice(boardingIndex + 1)
            : stations;
        setSelectOptions(alightingStation, '降車駅を選択', availableStations);
        onBoardingStationChange(selectedId);
    });
    alightingStation.addEventListener('change', event => onAlightingStationChange(event.target.value));
}

export function setBoardingTrains(trains, onTrainChange) {
    const trainSelect = document.getElementById('trainByTime');
    if (!trainSelect) return;

    setSelectOptions(
        trainSelect,
        '列車を選択',
        trains,
        train => train.trainId,
        train => {
            return train.arrivalTime;
        }
    );
    trainSelect.onchange = event => onTrainChange(event.target.value);
}

export function selectCalendar(index) {
    selectAutoOption(elements.calendar, index);
}

export function getTrains() {
    const trainSelect = document.getElementById('trainByTime');
    if (!trainSelect) return [];

    return [...trainSelect.options]
        .filter(option => option.value && option.dataset.auto !== 'true')
        .map(option => option.textContent);
}

export function selectTrainByTime(train) {
    const trainSelect = document.getElementById('trainByTime');
    if (!trainSelect) return false;

    const index = [...trainSelect.options].findIndex(option => {
        return option.dataset.auto !== 'true' && option.textContent === train;
    });

    if (index === -1) return false;

    return selectAutoOption(trainSelect, index);
}


export function setBoardingTrainsLoading() {
    const trainSelect = document.getElementById('trainByTime');
    if (trainSelect) {
        setSelectOptions(trainSelect, '読み込み中...', []);
    }
}

export function setRideResult(message) {
    const rideResult = document.getElementById('rideResult');
    if (rideResult) {
        rideResult.replaceChildren();
        const p = document.createElement('p');
        p.textContent = message;
        rideResult.append(p);
    }
}

export function clearRideDetails() {
    const rideResult = document.getElementById('rideResult');
    if(!rideResult) return;
    rideResult.replaceChildren();
}

export function setRideDetails({
    boardingStation,
    trainNumber,
    boardingTime,
    alightingStation,
    alightingTime,
    alarmTime,
    onSendRide,
}) {
    const rideResult = document.getElementById('rideResult');
    if (!rideResult) return;

    rideResult.replaceChildren();
    rideResult.insertAdjacentHTML('beforeend', '<h3>乗車情報</h3>');
    [
        `乗車駅: ${boardingStation}`,
        `乗車列車: ${trainNumber}`,
        `乗車時間: ${boardingTime}`,
        `降車駅: ${alightingStation}`
    ].forEach(text => {
            const p = document.createElement('p');
            p.textContent = text;
            rideResult.append(p);
        });

    const estimatedTime = document.createElement('h1');
    estimatedTime.textContent = `推定降車時間: ${alightingTime}`;
    rideResult.append(estimatedTime);

    const alarmTimeElement = document.createElement('h1');
    alarmTimeElement.textContent = `アラーム時間: ${alarmTime}`;
    rideResult.append(alarmTimeElement);

    const sendRide = document.createElement('button');
    sendRide.type = 'button';
    sendRide.textContent = '発信';
    if (onSendRide) {
        sendRide.addEventListener('click', onSendRide);
    }
    rideResult.append(sendRide);
}

export function onRailwayChange(handler) {
    elements.railway.addEventListener('change', handler);
}

export function onCalendarChange(handler) {
    elements.calendar.addEventListener('change', handler);
}

export function onLoadStationsClick(handler) {
    elements.loadStations.addEventListener('click', handler);
}

export function onAlightingTimeOffsetMinutesChange(handler) {
    elements.alightingTimeOffsetMinutesInput.addEventListener('input', event => {
        handler(event.target.value);
    });
}
