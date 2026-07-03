## 実行方法

RasberryPIに`main.js`を導入します。

実行:
```bash
node main.js [options...]
```

### オプション

- `--dry-run, -d`: LED ライト点滅なし、ボタンコントロールなし
- `--send-ride-request, -s`: (`--dry-run`と一緒に使用)PCへ乗車時刻の取得の申請を自動で行います（ボタンを1回短く押すのと同じ)
    - `relayServer`に接続成功した直後に、pc側に`getRideTime`を送信します。

> [!NOTE]
> argument parserは含んでいないので例えば`-d -s`を`-ds`に省略することはできません

## messageの型

`message: object{ type:String, content: Any } | String`

- 型が`object`かつ `type: String`と`content: Any`メンバがある場合、`type`と`content`の内容に基づいて処理
- その他の場合は単に`console.log()`を行う

### typeの詳細

typeの書式: `発信先.内容` 。 `pc.{content}` または `pi.{content}`  

#### `pi.setRideTime`

乗車タイマーを設定

``` js
content: { boardingTime, alightingTime } // ISO文字列を発送
```

#### `pc.getRideTime` 

webページで乗車駅、降車駅が選択された状態で、現在時刻に一番近い列車の乗車時間と降車時間を獲得。通信の遅延の可能性も考えて、pi側から送信したタイミングの時間も送ります。

- 返信: `pi.setRideTime` または `pi.getRideTimeError`

```js
type: "pi.setRideTime",
content: { currentTime } // ISO文字列
```

```js
type: "pi.getRideTimeError",
content: { type: String }   // "NotSelected" | "TrainNotFound"
```
