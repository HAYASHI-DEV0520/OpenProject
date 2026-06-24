import { requestI2CAccess } from "./node_modules/node-web-i2c/index.js";  
import { requestGPIOAccess } from "./node_modules/node-web-gpio/dist/index.js";  
import NPIX from "@chirimen/neopixel-i2c";  
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));  
  
// 設定（外部から読み込む想定）  
const DELAY_SECONDS = 30000; // 指定された秒数  
const NEOPIXEL_COUNT = 7; // LEDの個数  
  
// 状態管理  
let isStarted = false; // 光りだしたかどうか  
let isLit = false; // 現在光っているかどうか  
let npix; // Neopixelインスタンス  
  
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
  
  console.log("初期化完了。ボタンを押して開始してください。");  
}  
  
async function handleButtonPress(ev) {  
  // ボタン押下時（ev.value == 0）のみ処理  
  if (ev.value !== 0) return;  
  
  if (!isStarted) {  
    // 光りだす前は何もしない  
    console.log("まだ開始されていません");  
    return;  
  }  
  
  if (isLit) {  
    // 光っている状態でボタンを押したら消灯  
    await npix.setGlobal(0, 0, 0);  
    isLit = false;  
    console.log("消灯しました");  
  } else {  
    // 光っていない状態でボタンを押したら点灯処理開始  
    isLit = true;  
    console.log("点灯処理開始");  
      
    // 即時0.5秒光る  
    await npix.setGlobal(50, 50, 50); // 白色で点灯  
    await sleep(500);  
    await npix.setGlobal(0, 0, 0); // 一旦消灯  
      
    // 指定秒数待機  
    console.log(`${DELAY_SECONDS}秒待機中...`);  
    await sleep(DELAY_SECONDS * 1000);  
      
    // ずっと光る  
    await npix.setGlobal(100, 0, 0); // 赤色で常時点灯  
    console.log("常時点灯開始");  
  }  
}  
  
// 外部から開始をトリガーする関数  
function startLighting() {  
  isStarted = true;  
  console.log("開始フラグが立ちました。ボタンで操作できます。");  
}