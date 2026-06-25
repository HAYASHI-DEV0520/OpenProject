import { requestI2CAccess } from "./node_modules/node-web-i2c/index.js";  
import { requestGPIOAccess } from "./node_modules/node-web-gpio/dist/index.js";  
import NPIX from "@chirimen/neopixel-i2c";  
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));  
  
// 設定（外部から読み込む想定）  
const DELAY_SECONDS = 3; // 指定された秒数  
const NEOPIXEL_COUNT = 7; // LEDの個数  
const LONG_PRESS_DURATION = 2000; // 長押し判定時間（ミリ秒）  
  
// 状態管理  
let isTimerRunning = false; // タイマー動作中かどうか  
let isLit = false; // 常時点灯中かどうか  
let npix; // Neopixelインスタンス  
let timerId = null; // タイマーID（キャンセル用）  
let longPressTimerId = null; // 長押し検出用タイマーID  
let buttonPressStartTime = 0; // ボタン押下開始時刻  
  
main();  
  
async function main() {  
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
  
  console.log("初期化完了。ボタンを押してください。");  
}  
  
async function handleButtonPress(ev) {  
  if (ev.value === 0) {  
    // ボタン押下時  
    buttonPressStartTime = Date.now();  
      
    // 長押し検出タイマーをセット  
    longPressTimerId = setTimeout(async () => {  
      if (isTimerRunning) {  
        // タイマー動作中に長押しされた場合  
        console.log("長押し検出：タイマーをキャンセルします");  
        clearTimeout(timerId); // メインタイマーをキャンセル  
        isTimerRunning = false;  
          
        // 0.2秒点灯  
        await npix.setGlobal(50, 50, 50);  
        await sleep(200);  
        await npix.setGlobal(0, 0, 0);  
        console.log("タイマー停止完了");  
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
      await handleShortPress();  
    }  
  }  
}  
  
async function handleShortPress() {  
  // タイマー動作中は短押し無効  
  if (isTimerRunning) {  
    console.log("タイマー動作中です。短押しは無効です。");  
    return;  
  }  
}