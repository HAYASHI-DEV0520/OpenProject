# Channel通信の方針

## messageの型

`message: object | String`

- 型が`object`かつ `type: String`メンバがある場合、`type`の内容に基づいて処理
- その他の場合は単に`console.log()`を行う


