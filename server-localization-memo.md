## 仕様変更メモ（サーバー → フロント）

サーバーから `{"id", "jp_name"}` を frontend に送るようになったため、  
フロント側での手っ取り早い処理例を共有します。

### 1. データ正規化

```js
function normalizeLocalizedItem(item) {
  if (typeof item === 'string') {
    return { id: item, nameJa: item };
  }

  return {
    id: item?.id || '',
    nameJa: item?.nameJa || item?.id || ''
  };
}
```

### 2. 路線リストの読み込み

```js
async function loadRailways() {
  const railways = (await fetchJson(api.railways)).map(normalizeLocalizedItem);
  railwayEl.innerHTML =
    '<option value="">線路を選択</option>' +
    railways.map(r => `<option value="${r.id}">${r.nameJa} (${r.id})</option>`).join('');
}
```

### 3. 駅IDから駅名を引く

```js
function stationNameById(stationId) {
  const station = currentStations.find(s => s.id === stationId);
  return station ? station.nameJa : stationId;
}
```

```html
<p>乗車駅: ${stationNameById(selectedBoardingStation)} (${selectedBoardingStation})</p>
```

---

## サーバー起動前の準備

### 1. 依存モジュールのインストール（初回のみ）

サーバー起動前に、`server/` フォルダで以下を実行してください。  
（新しいモジュールが追加されています）

```bash
cd server
npm install
```

### 2. `.env` ファイルの作成

`server/` 配下に `.env` を作成してください。  
中身（環境変数）は DM で共有します。
