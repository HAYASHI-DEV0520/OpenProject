import {RelayServer} from "https://www.chirimen.org/remote-connection/js/beta/RelayServer.js";

const CHANNEL_NAME = "op2026";

let channel;

/**
 * chirimentestサーバのCHANNEL_NAMEチャンネルに接続し、onmessageを設定する
*/
async function connect(onmessage){
	// webSocketリレーの初期化
	let relay = RelayServer("chirimentest", "chirimenSocket" );
	channel = await relay.subscribe(CHANNEL_NAME);
	messageDiv.innerText="web socketリレーサービスに接続しました";
    channel.onmessage = onmessage
}
