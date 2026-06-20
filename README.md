# OpenProject
中大の2026年度オープンプロジェクト演習のソースコントロールです。
# 中央大学 オープンプロジェクト演習 20XX ページ

- このページの URL: https://urls.jp/op2026
    - 昨年のページ (参考): https://urls.jp/op2025
- ページ右上の編集 (鉛筆アイコン) ボタンをクリックして編集してください。こちらは**一般公開ページです。公開されたくない個人情報などは記載しないでください**
    - HackMD の使い方は [機能紹介ページ](https://hackmd.io/features-jp) を参照。左上の鉛筆・2パネル・目のアイコンが並ぶボタンで鉛筆(または2パネル)ボタンをクリックすると編集(プレビュー)画面になります。GitHub その他アカウントでの**ログインは必須ではありません**。
- RasPi 用一時利用 WiFi (必要時のみオンにします)
    - ~~**SSID/Pass = .dNet / sharedwifi**~~
    - **SSID/Pass = .dynaperia / sharedlte** (低速、必要時追加)
    - ~~**SSID/Pass = .hand / sharedlte**~~ (低速、必要時追加)


## CHIRIMEN について

ブラウザ上の JavaScript から画面 (Virtual) と物理 (Physical) の両方を織り交ぜて容易にプロトタイピング開発可能な環境。

- [CHIRIMEN Tutorial (PiZero)](https://tutorial.chirimen.org/pizero/)
    - [CHIRIMEN とは](https://tutorial.chirimen.org/about)
    - [Hello Real World](https://tutorial.chirimen.org/pizero/#hello-real-worlda-hrefchirimengenericl-la)
    - [Web Serial ターミナル](https://chirimen.org/PiZeroWebSerialConsole/PiZeroWebSerialConsole.html)
    - [AI アシスタント](https://chirimen.org/pizero/using-ai-assistant)
    - [遠隔コントロール手順](https://tutorial.chirimen.org/pizero/chapter_10-6)
        - [リレーサーバライブラリ](https://chirimen.org/remote-connection/#%E4%BD%BF%E7%94%A8%E6%96%B9%E6%B3%95)
        - [サンプル集](https://tutorial.chirimen.org/pizero/esm-examples/)の remote example も参考に
- [対応デバイスリスト](https://tutorial.chirimen.org/raspi/partslist)
- [PiZero(Node) Examples (回路図・サンプルコード一式)](https://tutorial.chirimen.org/pizero/esm-examples/)
- [参考: Raspi 4 などで で動かしたい場合](https://tutorial.chirimen.org/raspi/)

## Raspberry Pi Zero

GIOP ピン配列図

![image](https://hackmd.io/_uploads/rJuFGmdQC.png)


### その他のリンク

役立ちそうな関連 URL があれば皆さん自由に追記・共有お願いします

- WebDINO Japan 
- 浅井: [Twitter](https://twitter.com/dynamitter), [Facebook](https://www.facebook.com/dynamis)
- ロボットマップ https://robotstart.co.jp/lab.html
- cloud network robotics https://sites.google.com/site/cloudnetworkrobots/home

## コミュニケーション・質問・QA

- Slack: https://tinkeringfield.slack.com/
- [参加用リンク](https://join.slack.com/t/tinkeringfield/shared_invite/zt-3zyjn8zvb-ng0naZH6cd4h4vj4tn7tNA)
- 質問回答共有**公開**チャンネル: #chuo-u-2026
    - 質問は原則 DM/private チャンネルではなく共有/公開チャンネルで行ってください

質問や要望などあれば随時 [Slack](https://tinkeringfield.slack.com/) にて聞いてください。

## スケジュール・宿題

- 2026/06/06 (土) 13:20-18:00
    - about:course
    - about:IoT
    - 開発環境体験 (Hello Real World)
    - 開発環境体験の続き (I2C, チュートリアル)
    - 宿題
        - どのようなものを作るか考えてくる
            - Input, Output に具体的に何を使うのかまで
        - 類似の先行事例があればそれについても調べる
            - Input, Output にどのようなものが使われているかまで
- 2026/6/13 (土) 10:00-18:00
    - (TBD) アイデアソン (プロダクトアイデア出し)
    - 調べてきた/考えてきたアイデア・先行事例発表とそれに対する相互フィードバック
    - フィードバックを受けてプロダクト案の練り直し・ブラッシュアップ、開発開始、アイデア改善
- 2026/6/20 (土) 10:00-18:00
    - 開発
    - 中間発表
    - 開発
- 2026/6/27 (土) 10:00-18:00
    - 仕上げ
    - 最終発表！



----------
## チームワーク

Slack またはグループ内で便利にやり取りできるツールを自由に選んでコミュニケーションしてください。

----------
## プロジェクト一覧

プロジェクト毎に、チームメンバー、プロダクト概要(数行)、説明やコードへのリンク、借りる機材リストなどを記載してください:

### チーム名 XXX

(メンバーリスト)

---

### 貸し出し機材一覧
#### LIN Jingqi
- スターターキット
- ラズパイ
- Type-A to Type-C 変換
- NeoPixel のドライバー
- NeoPixel ring
- スイッチ

#### 平部
- スターターキット
- ラズパイ
- NeoPixel ドライバー
- NeoPixel ring

#### 松尾
- NeoPixel ドライバー
- Neopixel ring
- ラズパイ
- スターターキット
- 8x8 NeoPixel

----------
## 自己紹介と事例共有

識別可能な名前と、IoT/IoRT に関して興味を持った事例についてのメモを記載してください。
気になる事例のひと言紹介
- 参照 URL https://...



### ひらべ
受講者です。
#### アイデア
- 猫舌の人が食べるタイミング
- 履修登録のミスが起きる
- アボカドが固い
- イヤホンを接続していないことに気づかない
- テレビの音量が最適にならない
    - 受け取る側が一定以上一定以下の音量を感知したら光る？→受け取り手側がどれくらいの音量を感知しているかが重要なので、テレビ側の機能では解決しづらい
- どのくらいのペースでジョギングすればいいかわからない
    - 呼気の二酸化炭素濃度や心拍数を測る
    - ランニングウォッチに似たような機能がありそう
- 電車で立っている時に何もできない
- 今いる駅がどこなのか結局わからない
- 電車で寝て、狙った駅で起きたい
    - 何かしらでいくつ先の駅で降りるか設定しておいて、加速度センサが反応した回数で判定して振動して知らせる
    - [こちら](https://tukutuku.mystrikingly.com/)のように位置情報システムをインプットするのが一般的な解決策？
- 言語を使わないでコミュニケーションしたり、ものを考えたい


### LIN Jingqi
- 自転車で手信号やジェスチャーと連動してウインカーを出したい
- 安全のために歩道を走ったときなど？に音で分かるようにする
- 新宿駅などの混雑度を加味して空いている改札に案内してほしい
- コップなどで、飲み物の消費期限が分かるようにしたい → 口の付け方と菌の増殖などを考える？一般的なシチュエーションでの時間をとりあえず表示したい
- 授業中に隣の教室で寝てる人？のアラームがうるさいので、静かに起きられるようにしたい
- コンビニプリンターやATMの空き状況、ほかのコンビニを推薦？使用時間の検知
- 円安
- 安全な信号無視を増やしたい、待つ人と渡る人がいて気まずい → 安全なら青や点滅にする
- 肩ぶつかりすぎ


### 武藤慧
良い散歩経路を作る研究をしているTAです。

#### アイデア
- 1階の人が2階の人を呼ぶのが大変 (「ご飯できたよー」とか) → 家庭内呼び出しベル
- 果物の品質をチェックしたい
- 食べ過ぎる (脂肪肝...)
- 筋トレが続かない
- 通勤・通学時間が長い
- 家賃が高い
- なかなか寝付けない
- ゼミが時間内に終わらない
- 締め切り直前までタスクに取り掛かれない
- イベント時にドームが混雑している
- 授業の出席率が低い


### 谷口光弘
麻雀AIを作ってる方のTAです。
#### アイデア用メモ
- 最近読みたい本ができたが電子版が公開されておらず、読み込むのに時間がかかっている。
- 川沿いに住んでいるのだが、散歩・ランニングする人が最近減ってきており、その影響か川沿いの小さなカフェやお菓子屋さんが消え始めている。コースのいくつかのスポットに誰でも書き込める記帳ノートみたいなものがあるとにぎやかになるかも。
- MacBook Air で普段作業しているが、負荷により発熱するとキーボードまでほんのり暖かくなって指先に伝わり、夏場は手を乗せるだけでげんなりする。
- 真夏は帽子しないと直射日光で暑い、帽子被ると髪ぺちゃんこなるし汗もかく。
- 父のいびきがうるさいが治すのも大変そうなので困る。私の方でイヤホンしながら寝てかき消すのもそろそろ面倒。むしろ父の口元の近くに付けられるノイズキャンセリング装置が無いものか。
- 突然の雨に洗濯物をやられた。天気予報は曇りだったのに。雨を検知して自動で守ってくれるものがほしい。
- どうしようもなく眠いが絶対絶対絶対今寝ちゃいけないというときに完全覚醒できる、お手軽に激痛をもたらすが安全な自傷グッズ。
- 抱き枕ならぬ抱いてくれる枕
- ぬい活が一部で流行っている。自律して動いたり喋ったりしたらもっと可愛いと思う。動く喋る機能部分のパーツを既存のぬいぐるみに入れる（着ける？）だけ。

---
[テンプレートリテラル
](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Template_literals?utm_source=chatgpt.com)

```
varname = "yyy"
console.log("xxx" + varname) // "xxxyyy"
console.log(`xxx + ${ varname }`) // xxxyyy"
```

the end
