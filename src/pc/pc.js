import {RelayServer} from "https://www.chirimen.org/remote-connection/js/beta/RelayServer.js";

const CHANNEL_NAME = "op2026";

let channel;

// DOM objects
const messageDiv        = document.getElementById("messageDiv");
let boardingSelect      = document.getElementById("boardingSelect");     // 乗車駅
let destinationSelect   = document.getElementById("destinationSelect");  // 降車駅
let applyButton         = document.getElementById("applyButton");        // 設定通信
let resetButton         = document.getElementById("resetButton");        // リセット

window.addEventListener("load", main);

async function main(){
    messageDiv =  document.getElementById("messageDiv")

	// webSocketリレーの初期化
	let relay = RelayServer("chirimentest", "chirimenSocket" );
	channel = await relay.subscribe(CHANNEL_NAME);
	messageDiv.innerText="web socketリレーサービスに接続しました";
        channel.onmessage = msg => messageDiv.innerText = msg.data;

    // dom 
}

/**
 * 乗車駅/降車駅リストに駅オプションを追加
 * @param select boardingSelect または destinationSelect
 * @param name   オプション名前
*/
function addStation(select, name) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
}


