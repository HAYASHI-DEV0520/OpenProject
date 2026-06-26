# Toei Timetable Explorer

ODPT API を使って都営交通の列車時刻表を取得し、

- Node.js サービスとして検索 API を提供
- ブラウザ画面で乗車駅・列車・降車駅を選んで到着時刻を確認

できるサンプルアプリです。

## セットアップ

```bash
npm install
```

## 起動方法

```bash
npm run serve
```

起動後、ブラウザで `http://localhost:3000` を開いてください。

## 環境変数

- `PORT`: Web サーバーの待ち受けポート（デフォルト: `3000`）
- `ODPT_CONSUMER_KEY`: ODPT API のコンシューマーキー

未指定時はコード内のデフォルトキーを使用します。

## 利用可能なスクリプト

- `npm run serve` / `npm start`: サーバー起動
- `npm test`: `example.js` を実行

## ディレクトリ構成

```text
.
├── server.js              # HTTPサーバーとAPIエンドポイント
├── timetableService.js    # 時刻表データ読み込み・インデックス化・検索ロジック
├── example.js             # サービス利用例
└── public/
    ├── index.html         # フロントエンドUI
    ├── app.js             # 画面ロジック
    └── WEB_APP.md         # 画面仕様メモ
```

## サーバー API

### GET `/api/status`

読み込み状態を返します。

レスポンス例:

```json
{
  "loaded": true,
  "records": 12345
}
```

### GET `/api/railways`

利用可能路線の一覧を返します（ローカライズ済み）。

レスポンス例:

```json
[
  { "id": "odpt.Railway:Toei.Asakusa", "nameJa": "都営浅草線" }
]
```

### GET `/api/calendars?railway=...`

指定路線のカレンダー一覧を返します。

### GET `/api/directions?railway=...&calendar=...`

指定路線・カレンダーの方向一覧を返します。

### GET `/api/stations?railway=...&calendar=...&direction=...`

指定条件の停車駅一覧を返します（ローカライズ済み）。

レスポンス例:

```json
[
  { "id": "odpt.Station:Toei.Asakusa.Sengakuji", "nameJa": "泉岳寺" }
]
```

### GET `/api/destination?railway=...&calendar=...&direction=...`

指定条件の終着駅を返します（ローカライズ済み）。

レスポンス例:

```json
{ "id": "odpt.Station:Toei.Asakusa.NishiMagome", "nameJa": "西馬込" }
```

### GET `/api/trains?station=...&railway=...&calendar=...&direction=...`

指定駅に到着する列車一覧を返します。路線・カレンダー・方向指定で絞り込み可能です。

レスポンス例:

```json
[
  {
    "railway": "odpt.Railway:Toei.Asakusa",
    "calendar": "odpt.Calendar:Weekday",
    "direction": "odpt.RailDirection:Southbound",
    "trainNumber": "726T",
    "destination": "odpt.Station:Toei.Asakusa.NishiMagome",
    "arrivalTime": "07:30",
    "stopIndex": 5,
    "railwayNameJa": "都営浅草線",
    "destinationNameJa": "西馬込"
  }
]
```

### GET `/api/train?trainNumber=...`

指定列車の時刻表全体を返します。

### GET `/api/trainArrival?trainNumber=...&station=...`

指定列車が指定駅に到着する時刻を返します。

## TimetableService の主要メソッド

- `TimetableService.getDefaultApiUrls()`
- `TimetableService.create(source)`
- `getRailways()` / `getRailwaysLocalized()`
- `getCalendars(railway)`
- `getDirections(railway, calendar)`
- `getDestinationStation(...)` / `getDestinationStationLocalized(...)`
- `getStations(...)` / `getStationsLocalized(...)`
- `getTrainsArrivingAtStation(station, railway?, calendar?, direction?)`
- `getTrainArrivalTimeAtStation(trainNumber, station)`
- `getTrainTimetable(trainNumber)`

## 補足

- Web UI の操作仕様は `public/WEB_APP.md` を参照してください。
- 実装例は `example.js` を参照してください。
