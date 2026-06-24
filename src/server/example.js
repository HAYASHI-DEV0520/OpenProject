const TimetableService = require('./timetableService');

const API_URL = 'https://api-public.odpt.org/api/v4/odpt:TrainTimetable?odpt:operator=odpt.Operator:Toei';

(async () => {
  const timetable = await TimetableService.create(API_URL);

  console.log('\n=== 線路のリスト ===');
  const railways = timetable.getRailways();
  console.log(`利用可能な線路: ${railways.length}個`);
  railways.slice(0, 5).forEach(r => console.log(`  - ${r}`));
  if (railways.length > 5) console.log(`  ... 他 ${railways.length - 5}個`);

// 最初の線路を選択
const railway = railways[1];
console.log(`\n=== ${railway} のカレンダータイプ ===`);
const calendars = timetable.getCalendars(railway);
calendars.forEach(c => console.log(`  - ${c}`));



// 最初のカレンダーを選択
const calendar = calendars[1];
console.log(`\n=== ${railway} / ${calendar} の方向 ===`);
const directions = timetable.getDirections(railway, calendar);
directions.forEach(d => console.log(`  - ${d}`));

// 最初の方向を選択
const direction = directions[0];
console.log(`\n=== ${railway} / ${calendar} / ${direction} の情報 ===`);
const destination = timetable.getDestinationStation(railway, calendar, direction);
console.log(`終着駅: ${destination}`);

const stations = timetable.getStations(railway, calendar, direction);
console.log(`\n停車駅 (${stations.length}駅):`);
stations.slice(0, 5).forEach(s => console.log(`  - ${s}`));
if (stations.length > 5) console.log(`  ... 他 ${stations.length - 5}駅`);

// 最初の駅での到着列車を表示
const firstStation = stations[0];
console.log(`\n=== ${firstStation} での到着列車 ===`);
const trainsAtStation = timetable.getTrainsArrivingAtStation(firstStation);
trainsAtStation.slice(0, 5).forEach(t => {
  console.log(
    `  列車 ${t.trainNumber}: ${t.arrivalTime} (${t.railway} ${t.calendar})`
  );
});
if (trainsAtStation.length > 5) {
  console.log(`  ... 他 ${trainsAtStation.length - 5}本`);
}

// 最初の列車の全ルートを表示
const firstTrainNumber = trainsAtStation[0].trainNumber;
console.log(`\n=== 列車 ${firstTrainNumber} の全ルート ===`);
const trainTimetable = timetable.getTrainTimetable(firstTrainNumber);
if (trainTimetable) {
  console.log(`線路: ${trainTimetable.railway}`);
  console.log(`カレンダー: ${trainTimetable.calendar}`);
  console.log(`方向: ${trainTimetable.direction}`);
  console.log(`起点: ${trainTimetable.originStation}`);
  console.log(`終点: ${trainTimetable.destinationStation}`);
  console.log(`\n停車駅:`);
  trainTimetable.stops.forEach(stop => {
    const time = stop.departureTime || stop.arrivalTime || '---';
    console.log(`  ${String(stop.order).padStart(2, ' ')}: ${time} ${stop.station}`);
  });
}

// 特定の駅での特定の列車の到着時間を取得
const testStation = stations[1];
const arrivalTime = timetable.getTrainArrivalTimeAtStation(
  firstTrainNumber,
  testStation
);
console.log(
  `\n列車 ${firstTrainNumber} が ${testStation} に到着する時間: ${arrivalTime}`
);
})();