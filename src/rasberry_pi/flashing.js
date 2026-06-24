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
  // ボタン押下時（ev.value == 0）のみ処理  
  if (ev.value !== 0) return;  
  
  // タイマー動作中はボタン無効  
  if (isTimerRunning) {  
    console.log("タイマー動作中です。ボタンは無効です。");  
    return;  
  }  
  
  if (isLit) {  
    // 常時点灯中にボタンを押したら消灯  
    await npix.setGlobal(0, 0, 0);  
    isLit = false;  
    console.log("消灯しました");  
  } else {  
    // 待機状態でボタンを押したら点灯処理開始  
    console.log("点灯処理開始");  
      
    // 即時0.5秒光る  
    await npix.setGlobal(50, 50, 50); // 白色で点灯  
    await sleep(500);  
    await npix.setGlobal(0, 0, 0); // 一旦消灯  
      
    // タイマー開始  
    isTimerRunning = true;  
    console.log(`${DELAY_SECONDS}秒待機中...（ボタン無効）`);  
    await sleep(DELAY_SECONDS * 1000);  
    isTimerRunning = false;  
      
    // ずっと光る  
    await npix.setGlobal(100, 0, 0); // 赤色で常時点灯  
    isLit = true;  
    console.log("常時点灯開始");  
  }  
}