# Toei Timetable Explorer

ODPT API を使って都営交通の列車時刻表を取得し、

- Rust サービスとして検索 API を提供
- ブラウザ画面で乗車駅・列車・降車駅を選んで到着時刻を確認

できるサンプルアプリです。

## セットアップ

`.env` ファイルを作成して API キーを設定してください。

```env
ODPT_CONSUMER_KEY=your_consumer_key_here
```

## 起動方法

### ローカル（Cargo）

```bash
cargo run
```

起動後、ブラウザで `http://localhost:3000` を開いてください。

### Docker

```bash
docker build -t timetable-reader .
docker run -p 3000:3000 timetable-reader
```

Dockerで起動する場合、環境変数を渡してください。

```bash
docker run -p 3000:3000 -e ODPT_CONSUMER_KEY=your_key timetable-reader
```

または

```bash
docker run -p 3000:3000 --env-file .env timetable-reader
```

## 環境変数

- `PORT`: Web サーバーの待ち受けポート（デフォルト: `3000`）
- `ODPT_CONSUMER_KEY`: ODPT API のコンシューマーキー

`ODPT_CONSUMER_KEY` が未設定の場合、起動時にエラーになります。

## デプロイ

### Elastic Beanstalk（GitHub Actions）

`master` ブランチへのプッシュで `.github/workflows/deploy-to-eb.yml` が自動実行され、AWS Elastic Beanstalk にデプロイされます。

事前に以下の GitHub Secrets を設定してください：

| シークレット名 | 内容 |
|---|---|
| `AWS_ROLE_TO_ASSUME` | OIDC 認証用 IAM ロール ARN |
| `ODPT_CONSUMER_KEY` | ODPT API のコンシューマーキー |

## 利用可能なコマンド

- `cargo run`: サーバー起動
- `cargo run --bin example`: CLI の動作例を実行
- `cargo test`: Rust テスト実行

## ディレクトリ構成

```text
.
├── .github/
│   └── workflows/
│       └── deploy-to-eb.yml  # Elastic Beanstalk 自動デプロイ
├── app/
│   └── public/
│       ├── index.html     # フロントエンドUI
│       ├── app.js         # 画面ロジック（選択フロー制御）
│       ├── api.js         # APIクライアント
│       ├── ui.js          # UI更新ヘルパー
│       ├── pi.js          # Raspberry Pi 連携
│       └── WEB_APP.md     # 画面仕様メモ
├── src/
│   ├── main.rs            # HTTPサーバーとAPIエンドポイント
│   ├── lib.rs             # 時刻表データ読み込み・インデックス化・検索ロジック
│   └── bin/example.rs     # サービス利用例
├── Cargo.toml
├── Dockerfile
└── .dockerignore
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
- `TimetableService.create(sources)`
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
- 実装例は `src/bin/example.rs` を参照してください。
