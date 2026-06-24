# Timetable Service

東京都営地下鉄のダイヤデータを効率的に管理・クエリするNode.jsサービスです。

## 機能概要

このサービスは以下の要件を満たすように設計されています：

1. **線路のリスト取得** - 利用可能な全ての線路を取得
2. **カレンダータイプ** - 平日（Weekday）、土曜日（Saturday）、祝日（Holiday）などを線路ごとに取得
3. **方向（Direction）の管理** - 各方向の終着駅を取得
4. **停車駅の順序保持** - 駅の順序を保持したリストを取得
5. **駅視点の時刻クエリ** - 特定の駅に到着する列車の時間リストを取得
6. **列車確定後の降車駅時刻取得** - 選んだ列車が特定の駅に到着する時間を取得

## インストール

```bash
npm install
```

## 使用方法

### 基本的な使用例

```javascript
const TimetableService = require('./timetableService');

(async () => {
  const timetable = await TimetableService.create(
    'https://api-public.odpt.org/api/v4/odpt:TrainTimetable?odpt:operator=odpt.Operator:Toei'
  );

  // 線路のリストを取得
  const railways = timetable.getRailways();
  // => ['odpt.Railway:Toei.Arakawa', 'odpt.Railway:Toei.Asakusa']

// 特定の線路のカレンダータイプを取得
const calendars = timetable.getCalendars('odpt.Railway:Toei.Asakusa');
// => ['odpt.Calendar:Holiday', 'odpt.Calendar:Saturday', 'odpt.Calendar:Weekday']

// 特定のカレンダータイプの方向を取得
const directions = timetable.getDirections('odpt.Railway:Toei.Asakusa', 'odpt.Calendar:Weekday');
// => ['odpt.RailDirection:Southbound', 'odpt.RailDirection:Northbound']

// 方向の終着駅を取得
const destination = timetable.getDestinationStation(
  'odpt.Railway:Toei.Asakusa',
  'odpt.Calendar:Weekday',
  'odpt.RailDirection:Southbound'
);
// => 'odpt.Station:Toei.Asakusa.NishiMagome'

// 方向の停車駅を取得（順序を保持）
const stations = timetable.getStations(
  'odpt.Railway:Toei.Asakusa',
  'odpt.Calendar:Weekday',
  'odpt.RailDirection:Southbound'
);
// => ['odpt.Station:Toei.Asakusa.Sengakuji', 'odpt.Station:Toei.Asakusa.Takanawadai', ...]

// 特定の駅に到着する列車を取得（時間順）
const trains = timetable.getTrainsArrivingAtStation('odpt.Station:Toei.Asakusa.Takanawadai');
// => [
//   { railway, calendar, direction, trainNumber, destination, arrivalTime: '07:30', ... },
//   { railway, calendar, direction, trainNumber, destination, arrivalTime: '07:42', ... },
//   ...
// ]

// 特定の列車が特定の駅に到着する時間を取得
const arrivalTime = timetable.getTrainArrivalTimeAtStation('726T', 'odpt.Station:Toei.Asakusa.Gotanda');
// => '07:31'

// 列車の全ルートを取得
const trainTimetable = timetable.getTrainTimetable('726T');
// => {
//   trainNumber: '726T',
//   railway: 'odpt.Railway:Toei.Asakusa',
//   calendar: 'odpt.Calendar:Weekday',
//   direction: 'odpt.RailDirection:Southbound',
//   originStation: 'odpt.Station:Toei.Asakusa.Sengakuji',
//   destinationStation: 'odpt.Station:Toei.Asakusa.NishiMagome',
//   stops: [
//     { order: 0, station, arrivalTime, departureTime, platformNumber },
//     { order: 1, station, arrivalTime, departureTime, platformNumber },
//     ...
//   ]
// }
```

## API リファレンス

### `static create(source)`

TimetableServiceのインスタンスを作成し、ローカルファイルまたはリモートAPIからデータを読み込みます。

- **source** (string): JSONファイルのパス、またはODPT APIのURL
- **戻り値**: Promise<TimetableService>

### `getRailways()`

利用可能な全ての線路を取得します。

- **戻り値**: 線路URIの配列（ソート済み）

### `getCalendars(railway)`

特定の線路で利用可能なカレンダータイプを取得します。

- **railway** (string): 線路URI
- **戻り値**: カレンダータイプURIの配列（ソート済み）

### `getDirections(railway, calendar)`

特定の線路とカレンダータイプの方向を取得します。

- **railway** (string): 線路URI
- **calendar** (string): カレンダータイプURI
- **戻り値**: 方向URIの配列（ソート済み）

### `getDestinationStation(railway, calendar, direction)`

特定の方向の終着駅を取得します。

- **railway** (string): 線路URI
- **calendar** (string): カレンダータイプURI
- **direction** (string): 方向URI
- **戻り値**: 終着駅のURI

### `getStations(railway, calendar, direction)`

特定の方向の停車駅を順序を保持して取得します。

- **railway** (string): 線路URI
- **calendar** (string): カレンダータイプURI
- **direction** (string): 方向URI
- **戻り値**: 駅URIの配列（順序を保持、重複なし）

### `getTrainsArrivingAtStation(station)`

特定の駅に到着する列車を時間順に取得します。

- **station** (string): 駅のURI
- **戻り値**: 以下の構造を持つオブジェクトの配列（arrivalTimeで昇順）
  ```javascript
  {
    railway: string,        // 線路URI
    calendar: string,       // カレンダータイプURI
    direction: string,      // 方向URI
    trainNumber: string,    // 列車番号
    destination: string,    // 終着駅URI
    arrivalTime: string,    // 到着時間（HH:MM形式）
    stopIndex: number       // 停車駅インデックス
  }
  ```

### `getTrainArrivalTimeAtStation(trainNumber, station)`

特定の列車が特定の駅に到着する時間を取得します。

- **trainNumber** (string): 列車番号
- **station** (string): 駅のURI
- **戻り値**: 到着時間（HH:MM形式）、見つからない場合はnull

### `getTrainTimetable(trainNumber)`

列車の全ルートを取得します。

- **trainNumber** (string): 列車番号
- **戻り値**: 以下の構造を持つオブジェクト、見つからない場合はnull
  ```javascript
  {
    trainNumber: string,        // 列車番号
    railway: string,            // 線路URI
    calendar: string,           // カレンダータイプURI
    direction: string,          // 方向URI
    originStation: string,      // 起点駅URI
    destinationStation: string, // 終着駅URI
    stops: [
      {
        order: number,           // 停車順序
        station: string,         // 駅URI
        arrivalTime: string,     // 到着時間（HH:MM形式）
        departureTime: string,   // 出発時間（HH:MM形式）
        platformNumber: string   // ホーム番号
      },
      ...
    ]
  }
  ```

## 実行例

```bash
# 使用例を実行
node example.js
```

## 内部設計

### インデックス構造

高速クエリのため、以下のインデックスが構築されます：

- **railways**: 全線路リスト
- **calendarMap**: 線路ごとのカレンダータイプマップ
- **directionMap**: 線路+カレンダーごとの方向マップ
- **stationMap**: 駅ごとの到着列車マップ（時間順）
- **trainMap**: 列車番号ごとのtimetableオブジェクトマップ

### パフォーマンス特性

- **初期化**: O(n)（nはtimetable数）
- **線路/カレンダー/方向取得**: O(1)
- **駅での列車リスト取得**: O(1)（事前にインデックス化）
- **時間順ソート**: 初期化時に1回のみ実施

## ユースケース

### 例1: ユーザーが乗る列車を決定

```javascript
// 1. 駅での到着列車リストを表示
const trains = timetable.getTrainsArrivingAtStation(userStation);
console.log('利用可能な列車:');
trains.forEach(t => console.log(`  ${t.arrivalTime}: ${t.trainNumber}`));

// 2. ユーザーが時間を選択
const selectedTrain = trains[0]; // 最初の列車を選択

// 3. 降車駅での到着時間を取得
const arrivalAtDestination = timetable.getTrainArrivalTimeAtStation(
  selectedTrain.trainNumber,
  userDestinationStation
);
console.log(`到着時間: ${arrivalAtDestination}`);
```

### 例2: 特定の線路・カレンダーの全ルート情報を取得

```javascript
const railway = 'odpt.Railway:Toei.Asakusa';
const calendar = 'odpt.Calendar:Weekday';
const direction = 'odpt.RailDirection:Southbound';

const stations = timetable.getStations(railway, calendar, direction);
const destination = timetable.getDestinationStation(railway, calendar, direction);

console.log(`線路: ${railway}`);
console.log(`カレンダー: ${calendar}`);
console.log(`終着駅: ${destination}`);
console.log(`停車駅数: ${stations.length}`);
stations.forEach((s, idx) => console.log(`  ${idx + 1}: ${s}`));
```

## ライセンス

MIT
