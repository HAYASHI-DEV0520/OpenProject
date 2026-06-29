import {RelayServer} from "https://www.chirimen.org/remote-connection/js/beta/RelayServer.js";

const CHANNEL_NAME = "op2026";

let channel;

/**
 * chirimentestサーバのCHANNEL_NAMEチャンネルに接続し、onmessageを設定する
*/
export async function connect(onmessage){
	let relay = RelayServer("chirimentest", "chirimenSocket" );
	channel = await relay.subscribe(CHANNEL_NAME);
    channel.onmessage = onmessage
    sendMessage("PC: web socketリレーサービスに接続しました");
}

export async function sendMessage(msg) {
    channel.send(msg);
}
