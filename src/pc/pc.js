import {RelayServer} from "https://www.chirimen.org/remote-connection/js/beta/RelayServer.js";

const CHANNEL_NAME = "op2026";

let channel;
let messageDiv;

window.addEventListener("load", main);

async function main(){
    messageDiv =  document.getElementById("messageDiv")

	// webSocketリレーの初期化
	let relay = RelayServer("chirimentest", "chirimenSocket" );
	channel = await relay.subscribe(CHANNEL_NAME);
	messageDiv.innerText="web socketリレーサービスに接続しました";
	channel.onmessage = msg => messageDiv.innerText = msg.data;
}


