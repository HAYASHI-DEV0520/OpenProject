import { requestGPIOAccess } from "./node_modules/node-web-gpio/dist/index.js";  
import { requestI2CAccess } from "./node_modules/node-web-i2c/index.js";  
import NPIX from "@chirimen/neopixel-i2c";  
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
const neoPixels = 7; // LED個数  
let npix; // 複数の関数で使用するためグローバル変数に  
  
async function main() {  
  // GPIO初期化（スイッチ用）  
  const gpioAccess = await requestGPIOAccess();  
  const port = gpioAccess.ports.get(5);  
  await port.export("in");  
  port.onchange = showPort;  
  
  // I2C初期化（Neopixel用）  
  const i2cAccess = await requestI2CAccess();  
  const i2cPort = i2cAccess.ports.get(1);  
  npix = new NPIX(i2cPort, 0x41);  
  await npix.init(neoPixels);  
    
  // 初期状態は消灯  
  await npix.setGlobal(0, 0, 0);  
}  
  let pressCount = 0;  
let timerId = null;  
let countingPhase = false;  // カウント期間中かどうかのフラグ  
  
async function showPort(ev) {  
  console.log(ev.value);  
  if (ev.value == 0) {  
    // ボタンが押された 
    if(pressCount==0){
         await npix.setGlobal(12, 12, 0);
    } 
    if (!countingPhase) {  
      // 最初の押下 - 10秒間のカウント期間を開始  
      countingPhase = true;  
      pressCount = 1;  
      console.log(`カウント開始。現在${pressCount}回`);  
        
      // 10秒後にカウント終了  
      timerId = setTimeout(async () => {  
        const delay = pressCount * 1000;  // 押した回数 × 1秒  
        console.log(`カウント終了。${pressCount}回押されました。${delay/1000}秒後に点灯します。`);  
         await npix.setGlobal(12, 12, 0);  // 点灯（黄色）  
        await sleep(500);  // 0.5秒点灯  
        await npix.setGlobal(0, 0, 0);   
        // delayミリ秒待ってから点灯  
        await sleep(delay);  
          
        await npix.setGlobal(64, 64, 0);  // 点灯（黄色）  
        await sleep(500);  // 0.5秒点灯  
        await npix.setGlobal(0, 0, 0);    // 消灯  
          
        // 状態リセット  
        countingPhase = false;  
        pressCount = 0;  
      }, 10000);  // 10秒間のカウント期間  
        
    } else {  
      // カウント期間中の追加押下  
      pressCount++;  
      console.log(`カウント中。現在${pressCount}回`);  
    }  
      
  } else {  
    // ボタンが離されたら即時消灯  
    await npix.setGlobal(0, 0, 0);  
  }  
}

  
main();