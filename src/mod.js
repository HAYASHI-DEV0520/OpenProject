// ここにコード入れてね
console.log("hello");
//了解しました
//こっそり入れたい
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