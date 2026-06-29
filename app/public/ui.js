const elements = {
    status: document.getElementById('status'),
    statusLog: document.getElementById('statusLog'),
    railway: document.getElementById('railway'),
    calendar: document.getElementById('calendar'),
    direction: document.getElementById('direction'),
    loadStations: document.getElementById('loadStations'),
    result: document.getElementById('result'),
    stepControls: document.getElementById('stepControls'),
    debug: document.getElementById('debug')
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

function setSelectOptions(select, placeholder, values, toID, toLabel) {
    select.replaceChildren();
    select.append(new Option(placeholder, ''));
    if(!toID){
        values.forEach(value => select.append(new Option(value.nameJa, value.id)));
    } else {
        values.forEach(value => select.append(new Option(toLabel(value), toID(value))));
    }
    
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
        .map(log => `<div>- ${log}</div>`)
        .join("");
    elements.status.textContent = message;
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

export function setDebug(data) {
    elements.debug.textContent = JSON.stringify(data, null, 2);
}

export function setLoadStationsDisabled(disabled) {
    elements.loadStations.disabled = disabled;
}

export function renderStepControls({ stations, destination, onBoardingStationChange, onAlightingStationChange, onConfirmRide }) {
    elements.stepControls.innerHTML = `
<div class="row">
    <div>
        <label for="boardingStation">乗車駅</label>
        <select id="boardingStation"></select>
    </div>
    <div>
        <label for="trainByTime">乗車時間で列車を選択</label>
        <select id="trainByTime"></select>
    </div>
    <div>
        <label for="alightingStation">降車駅</label>
        <select id="alightingStation"></select>
    </div>
</div>
<button id="confirmRide">乗車列車を確定</button>
<div id="rideResult"></div>
`;

    const boardingStation = document.getElementById('boardingStation');
    const trainByTime = document.getElementById('trainByTime');
    const alightingStation = document.getElementById('alightingStation');
    const confirmRide = document.getElementById('confirmRide');

    setSelectOptions(boardingStation, '乗車駅を選択', stations);
    setSelectOptions(trainByTime, '列車を選択', []);
    setSelectOptions(alightingStation, '降車駅を選択', stations);

    boardingStation.addEventListener('change', event => onBoardingStationChange(event.target.value));
    alightingStation.addEventListener('change', event => onAlightingStationChange(event.target.value));
    confirmRide.addEventListener('click', () => onConfirmRide(destination));
}

export function setBoardingTrains(trains, onTrainChange) {
    const trainSelect = document.getElementById('trainByTime');
    if (!trainSelect) return;

    setSelectOptions(
        trainSelect,
        '列車を選択',
        trains,
        train => train.trainNumber,
        train => {
            return `${train.arrivalTime} - ${train.trainNumber}`;
        }
    );
    trainSelect.onchange = event => onTrainChange(event.target.value);
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

export function setRideDetails({ boardingStation, trainNumber, boardingTime, alightingStation, alightingTime }) {
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
