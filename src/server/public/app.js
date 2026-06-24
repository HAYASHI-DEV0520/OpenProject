const statusEl = document.getElementById('status');
const railwayEl = document.getElementById('railway');
const calendarEl = document.getElementById('calendar');
const directionEl = document.getElementById('direction');
const loadStationsBtn = document.getElementById('loadStations');
const resultEl = document.getElementById('result');
const stepControlsEl = document.getElementById('stepControls');
const debugEl = document.getElementById('debug');

const api = {
  railways: '/api/railways',
  calendars: '/api/calendars',
  directions: '/api/directions',
  stations: '/api/stations',
  trains: '/api/trains',
  destination: '/api/destination',
  train: '/api/train',
  trainArrival: '/api/trainArrival',
  status: '/api/status'
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function updateStatus() {
  try {
    const data = await fetchJson(api.status);
    statusEl.textContent = `ロード完了: ${data.records} 件のダイヤを読み込みました。`;
  } catch (err) {
    statusEl.textContent = `エラー: ${err.message}`;
  }
}

async function loadRailways() {
  const railways = await fetchJson(api.railways);
  railwayEl.innerHTML = '<option value="">線路を選択</option>' + railways.map(r => `<option value="${r}">${r}</option>`).join('');
}

async function loadCalendars() {
  const railway = railwayEl.value;
  if (!railway) return;
  const calendars = await fetchJson(`${api.calendars}?railway=${encodeURIComponent(railway)}`);
  calendarEl.innerHTML = '<option value="">カレンダーを選択</option>' + calendars.map(c => `<option value="${c}">${c}</option>`).join('');
}

async function loadDirections() {
  const railway = railwayEl.value;
  const calendar = calendarEl.value;
  if (!railway || !calendar) return;
  const directions = await fetchJson(`${api.directions}?railway=${encodeURIComponent(railway)}&calendar=${encodeURIComponent(calendar)}`);
  directionEl.innerHTML = '<option value="">方向を選択</option>' + directions.map(d => `<option value="${d}">${d}</option>`).join('');
}

let boardingStations = [];
let selectedBoardingStation = null;
let selectedTrain = null;
let selectedAlightingStation = null;
let currentStations = [];

async function loadStations() {
  const railway = railwayEl.value;
  const calendar = calendarEl.value;
  const direction = directionEl.value;
  if (!railway || !calendar || !direction) {
    resultEl.innerHTML = '<p>線路・カレンダー・方向を選択してください。</p>';
    stepControlsEl.innerHTML = '';
    return;
  }

  currentStations = await fetchJson(`${api.stations}?railway=${encodeURIComponent(railway)}&calendar=${encodeURIComponent(calendar)}&direction=${encodeURIComponent(direction)}`);
  const destination = await fetchJson(`${api.destination}?railway=${encodeURIComponent(railway)}&calendar=${encodeURIComponent(calendar)}&direction=${encodeURIComponent(direction)}`);

  boardingStations = currentStations;
  selectedBoardingStation = null;
  selectedTrain = null;
  selectedAlightingStation = null;

  renderStepControls(destination);
  showRouteInfo(destination);
  debugEl.textContent = JSON.stringify({ currentStations, destination }, null, 2);
}

function renderStepControls(destination) {
  stepControlsEl.innerHTML = `
    <div class="row">
      <div>
        <label for="boardingStation">乗車駅</label>
        <select id="boardingStation"><option value="">乗車駅を選択</option>${boardingStations.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
      </div>
      <div>
        <label for="trainByTime">乗車時間で列車を選択</label>
        <select id="trainByTime"><option value="">列車を選択</option></select>
      </div>
      <div>
        <label for="alightingStation">降車駅</label>
        <select id="alightingStation"><option value="">降車駅を選択</option>${currentStations.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
      </div>
    </div>
    <button id="confirmRide">乗車列車を確定</button>
    <div id="rideResult"></div>
  `;

  document.getElementById('boardingStation').addEventListener('change', async (event) => {
    selectedBoardingStation = event.target.value;
    selectedTrain = null;
    selectedAlightingStation = null;
    await loadTrainsForBoardingStation();
  });

  document.getElementById('alightingStation').addEventListener('change', (event) => {
    selectedAlightingStation = event.target.value;
  });

  document.getElementById('confirmRide').addEventListener('click', async () => {
    await confirmRide(destination);
  });
}

async function loadTrainsForBoardingStation() {
  const boardSelect = document.getElementById('boardingStation');
  const trainSelect = document.getElementById('trainByTime');
  trainSelect.innerHTML = '<option value="">読み込み中...</option>';

  if (!selectedBoardingStation) {
    trainSelect.innerHTML = '<option value="">列車を選択</option>';
    return;
  }

  const trains = await fetchJson(`${api.trains}?station=${encodeURIComponent(selectedBoardingStation)}`);
  const options = ['<option value="">列車を選択</option>', ...trains.map(t => `<option value="${t.trainNumber}">${t.arrivalTime} - ${t.trainNumber}</option>`)];
  trainSelect.innerHTML = options.join('');

  trainSelect.addEventListener('change', (event) => {
    selectedTrain = event.target.value;
  });
}

async function confirmRide(destination) {
  const rideResultEl = document.getElementById('rideResult');
  if (!selectedBoardingStation || !selectedTrain || !selectedAlightingStation) {
    rideResultEl.innerHTML = '<p>乗車駅、列車、降車駅をすべて選択してください。</p>';
    return;
  }

  if (selectedBoardingStation === selectedAlightingStation) {
    rideResultEl.innerHTML = '<p>乗車駅と降車駅が同じです。別の駅を選択してください。</p>';
    return;
  }

  const timetable = await fetchJson(`${api.train}?trainNumber=${encodeURIComponent(selectedTrain)}`);
  const boardIndex = timetable.stops.findIndex(stop => stop.station === selectedBoardingStation);
  const alightIndex = timetable.stops.findIndex(stop => stop.station === selectedAlightingStation);

  if (boardIndex === -1 || alightIndex === -1 || alightIndex <= boardIndex) {
    rideResultEl.innerHTML = '<p>選択した列車は乗車駅から降車駅へ向かいません。別の組み合わせを選択してください。</p>';
    return;
  }

  const boardingTime = timetable.stops[boardIndex].arrivalTime || timetable.stops[boardIndex].departureTime || '不明';
  const alightingTime = timetable.stops[alightIndex].arrivalTime || timetable.stops[alightIndex].departureTime || '不明';

  rideResultEl.innerHTML = `
    <h3>乗車情報</h3>
    <p>乗車駅: ${selectedBoardingStation}</p>
    <p>乗車列車: ${selectedTrain}</p>
    <p>乗車時間: ${boardingTime}</p>
    <p>降車駅: ${selectedAlightingStation}</p>
    <p>推定降車時間: ${alightingTime}</p>
  `;
}

function showRouteInfo(destination) {
  const stationHtml = currentStations.map((s, idx) => `<li>${s}</li>`).join('');
  resultEl.innerHTML = `
    <p>終着駅: ${destination}</p>
    <h3>停車駅</h3>
    <ol>${stationHtml}</ol>
  `;
}

railwayEl.addEventListener('change', async () => {
  await loadCalendars();
  directionEl.innerHTML = '<option value="">方向を選択</option>';
});

calendarEl.addEventListener('change', async () => {
  await loadDirections();
});

loadStationsBtn.addEventListener('click', async () => {
  loadStationsBtn.disabled = true;
  try {
    await loadStations();
  } catch (err) {
    resultEl.innerHTML = `<p>エラー: ${err.message}</p>`;
  } finally {
    loadStationsBtn.disabled = false;
  }
});

(async () => {
  //await updateStatus();
  await loadRailways();
})();
