import nodeWebSocketLib from "websocket";
import {RelayServer} from "./RelayServer.js";
import { requestI2CAccess } from "./node_modules/node-web-i2c/index.js";  
import { requestGPIOAccess } from "./node_modules/node-web-gpio/dist/index.js";  
import NPIX from "@chirimen/neopixel-i2c";  

const CHANNEL_NAME = "op2026-TTE";　// resel server channel名

// 発光設定  
// const DELAY_SECONDS = 3;          // タイマー秒数  
const NEOPIXEL_COUNT = 7;         // LEDの個数  
const LONG_PRESS_DURATION = 2000; // 長押し判定時間（ミリ秒）  
const FADE_DURATION = 30000;      // フェード時間（ミリ秒）  
const BLINK_INTERVAL = 500;       // 点滅間隔（ミリ秒）  
const FADE_STEPS = 300;           // フェードのステップ数（100ms間隔 × 300 = 30秒）  

// 状態管理  
let isTimerRunning = false;   // タイマーカウント中かどうか  
let isLit = false;            // LED点灯シーケンス動作中かどうか  
let npix;                     // Neopixelインスタンス  
let timerId = null;           // タイマーID（キャンセル用）  
let longPressTimerId = null;  // 長押し検出用タイマーID  
let buttonPressStartTime = 0; // ボタン押下開始時刻  
let blinkIntervalId = null;   // 点滅用インターバルID  
let waitingTimerID = null;

let dryRun = false;

let channel;


const sleep =  msec => new Promise(resolve => setTimeout(resolve, msec));  

// ╔═════════════════════════════════════════════════════════╗
// ║                   ボタン/neopixel制御                   ║
// ╚═════════════════════════════════════════════════════════╝

async function handleButtonPress(ev) {  
    if (ev.value === 0) {  
        // ボタン押下時  
        buttonPressStartTime = Date.now();  

        // 長押し検出タイマーをセット  
        longPressTimerId = setTimeout(async () => {  
            if (isLit) {  
                // LED点灯中に長押し → 消灯  
                console.log("長押し検出：LEDを消灯します");  
                await stopLight();  
                console.log("消灯完了");  
            } else if (isTimerRunning) {  
                // タイマー動作中に長押し → タイマーキャンセル  
                console.log("長押し検出：タイマーをキャンセルします");  
                clearTimeout(timerId);  
                isTimerRunning = false;  
                console.log("タイマー停止完了");  
                await timerStopBlink();
            }  else if (waitingTimerID != null) {
                clearTimeout(waitingTimerID);
                waitingTimerID = null;
                console.log("待機取り消し");  
                await timerStopBlink();
            }
        }, LONG_PRESS_DURATION);  

    } else {  
        // ボタン離脱時  
        if (longPressTimerId) {  
            clearTimeout(longPressTimerId);  
            longPressTimerId = null;  
        }  

        const pressDuration = Date.now() - buttonPressStartTime;  

        // 短押し（長押しでない）の場合のみ処理  
        if (pressDuration < LONG_PRESS_DURATION) {  
            if (isTimerRunning || waitingTimerID != null) {
                console.log("リクエストが無効です。タイマーがすでに動いています");
            } else {
                sendRideRequest()
            }
        }  
    }  
}  

async function startNewTimer(delay_seconds) {
    // タイマー動作中または点灯中は短押し無効  
    if (isTimerRunning || isLit) {  
        console.log("タイマーは無効です");  
        return;  
    }  

    // タイマー開始（LEDはまだ点灯しない）  
    isTimerRunning = true;  
    console.log("タイマー開始");  

    timerId = setTimeout(async () => {  
        isTimerRunning = false;  
        isLit = true;  
        console.log("タイマー終了：LED点灯シーケンス開始");  
        if (!dryRun) await startLightSequence();  
    }, delay_seconds * 1000);  
}

async function startLightSequence() {  
    // フェーズ1: 30秒で (0,0,0) → (255,120,20)  
    console.log("フェーズ1: フェード開始");  
    await fadeColor(0, 0, 0, 128, 60, 10, FADE_DURATION);  

    if (!isLit) return; // 消灯された場合は中断  

    // フェーズ2: 30秒で (255,120,20) → (255,255,255)  
    console.log("フェーズ2: フェード開始");  
    await fadeColor(128, 60, 10, 255, 255, 255, FADE_DURATION);  

    if (!isLit) return; // 消灯された場合は中断  

    // フェーズ3: 0.5秒間隔で点滅  
    console.log("フェーズ3: 点滅開始");  
    startBlinking();  
}  

async function fadeColor(r1, g1, b1, r2, g2, b2, duration) {  
    const stepInterval = duration / FADE_STEPS; // 100ms  

    for (let i = 0; i <= FADE_STEPS; i++) {  
        if (!isLit) return; // 消灯された場合は中断  
        const t = i / FADE_STEPS;  
        const r = Math.round(r1 + (r2 - r1) * t);  
        const g = Math.round(g1 + (g2 - g1) * t);  
        const b = Math.round(b1 + (b2 - b1) * t);  
        await npix.setGlobal(r, g, b);  
        await sleep(stepInterval);  
    }  
}  

function startBlinking() {  
    let blinkState = true;  
    blinkIntervalId = setInterval(async () => {  
        if (!isLit) {  
            clearInterval(blinkIntervalId);  
            blinkIntervalId = null;  
            return;  
        }  
        if (blinkState) {  
            await npix.setGlobal(255, 255, 255);  
        } else {  
            await npix.setGlobal(0, 0, 0);  
        }  
        blinkState = !blinkState;  
    }, BLINK_INTERVAL);  
}  

async function stopLight() {  
    isLit = false;  
    // 点滅インターバルをクリア  
    if (blinkIntervalId) {  
        clearInterval(blinkIntervalId);  
        blinkIntervalId = null;  
    }  
    await npix.setGlobal(0, 0, 0);  
}

async function timerStopBlink() {
    await npix.setGlobal(128, 60, 20);
    await sleep(500);
    await npix.setGlobal(0, 0, 0);
}

// ╔═════════════════════════════════════════════════════════╗
// ║                       server通信                        ║
// ╚═════════════════════════════════════════════════════════╝

// chirimentestサーバーのCHANNEL_NAMEチャンネルに接続し、channelからのメッセージをconsoleに出力
async function connect() {
    let relay = RelayServer("chirimentest", "chirimenSocket", nodeWebSocketLib, "https://chirimen.org");
    channel = await relay.subscribe(CHANNEL_NAME);
    console.log("web socketリレーサービスに接続しました");
    channel.onmessage = msg => {
        if (msg === null) return;

        let data = msg.data;

        console.log(`[receive]: ${JSON.stringify(data)}`);
        if (typeof data === "object" 
            && "type" in data
            && "content" in data
            && data.type.startsWith("pi."))
            onMessageObject(data); 
    }
}

function sendRideRequest() {
    console.log("乗車リクエストを送信");
    channel.send({
        type: "pc.getRideTime",
        content: {
            currentTime: new Date().toISOString()
        }
    });
}

async function onMessageObject(msgData) {
    const type = msgData.type.slice(3);
    switch (type) {
        case "setRideTime": {
            const { boardingTime, alightingTime } = msgData.content;
            await onSetRideTime(new Date(boardingTime), new Date(alightingTime));
            return;
        }
        case "getRideTimeError": {
            switch(msgData.content) {
                case "NotSelected": 
                    console.log("エラー: 乗車駅または降車駅が選択されていません");
                    return;
                case "TrainNotFound":
                    console.log("エラー: 選択した列車は乗車駅から降車駅へ向かいません。別の組み合わせを選択してください。");
                    return;
            }
        }
    }
}

// ╔═════════════════════════════════════════════════════════╗
// ║                          main                           ║
// ╚═════════════════════════════════════════════════════════╝


async function onSetRideTime(boardingTime, alightingTime) {
    clearTimeout(waitingTimerID);
    waitingTimerID = null;
    if (boardingTime > alightingTime) 
        throw new Error("onSetRideTime(): boardingTime > alightingTime");

    let now = new Date();

    if (now > alightingTime) {
        console.log("onSetRideTime(): もう降車時間を過ぎています");
        return;
    }
    if (now < boardingTime) {
        console.log(`onSetRideTime(): 乗車時間まで待機: ${(boardingTime - now) / 1000} 秒`);
        waitingTimerID = setTimeout(async () => {
            now = new Date();
            await startNewTimer(Math.max(0, (alightingTime - now)) / 1000);
            waitingTimerID = null;
        }, boardingTime - now);
    } else  {
        now = new Date();
        await startNewTimer(Math.max(0, (alightingTime - now)) / 1000);
    }

}

async function main() {  
    let needsSendRideRequest = false;

    if (process.argv.includes("--dry-run") || process.argv.includes("-d")) {
        dryRun = true;
        if (process.argv.includes("--send-ride-request") || process.argv.includes("-s")) {
            needsSendRideRequest = true;
        }
    }
    console.log(`[args]: ${dryRun ? "dry-run" : ""} ${needsSendRideRequest ? "send-ride-request" : ""}`);

    if (!dryRun) {
        // I2C初期化（Neopixel用）  
        const i2cAccess = await requestI2CAccess();  
        const port = i2cAccess.ports.get(1);  
        npix = new NPIX(port, 0x41);  
        await npix.init(NEOPIXEL_COUNT);  

        // GPIO初期化（ボタン用）  
        const gpioAccess = await requestGPIOAccess();  
        const buttonPort = gpioAccess.ports.get(5);  
        await buttonPort.export("in");  
        buttonPort.onchange = handleButtonPress;  
    }

    // channelに接続
    await connect();

    console.log("初期化完了");  

    if (needsSendRideRequest) {
        sendRideRequest();
    }
}

main();
