# RelayServerのChannel通信の方針

## 実行方法

RasberryPIに`main.js`を導入します。

通常実行:
```bash
node main.js
```

dry run(LED ライト点滅なし、ボタンなし):
```bash
node main.js --dry-run
```

## messageの型

`message: object{ type:String, content: Any } | String`

- 型が`object`かつ `type: String`と`content: Any`メンバがある場合、`type`と`content`の内容に基づいて処理
- その他の場合は単に`console.log()`を行う

### typeの詳細

typeの書式: `発信先.内容`  

`pc.{content}` または `pi.{content}`  

- `pi.setRideTime` : タイマーを設定

```
content: { boardingTime, alightingTime } // ISO文字列を発送
```


