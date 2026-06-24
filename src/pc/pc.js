import {RelayServer} from "https://www.chirimen.org/remote-connection/js/beta/RelayServer.js";

const CHANNEL_NAME = "op2026";

let channel;

// DOM objects
const messageDiv          = document.getElementById("messageDiv");
const lineSelect          = document.getElementById("lineSelect");         // 線路
const boardingSelect      = document.getElementById("boardingSelect");     // 乗車駅
const destinationSelect   = document.getElementById("destinationSelect");  // 降車駅
const applyButton         = document.getElementById("applyButton");        // 設定通信
const resetButton         = document.getElementById("resetButton");        // リセット
const selectedBoarding    = document.getElementById("selectedBoarding");
const selectedDestination = document.getElementById("selectedDestination");

window.addEventListener("load", main);

async function main(){
	// webSocketリレーの初期化
	let relay = RelayServer("chirimentest", "chirimenSocket" );
	channel = await relay.subscribe(CHANNEL_NAME);
	messageDiv.innerText="web socketリレーサービスに接続しました";
        channel.onmessage = msg => messageDiv.innerText = msg.data;

    applyButton.addEventListener(
        "click",
        () => {
            selectedBoarding.textContent = boardingSelect.value;
            selectedDestination.textContent = destinationSelect.value;
        }
    )
    resetButton.addEventListener(
        "click",
        () => {
            selectedBoarding.textContent = "未選択";
            selectedDestination.textContent = "未選択";
        }
    )

    // テスト用
    const oedoLineOption = document.createElement("option");
    oedoLineOption.value = "大江戸線";
    oedoLineOption.textContent = "大江戸線";
    lineSelect.appendChild(oedoLineOption);
    addStation("春日駅");
    addStation("飯田橋駅");
    addStation("門前仲町駅");

}



/**
 * 乗車駅/降車駅リストに駅オプションを追加
*/
function addStation(name) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    boardingSelect.appendChild(option);
    destinationSelect.appendChild(option.cloneNode(true));
}
