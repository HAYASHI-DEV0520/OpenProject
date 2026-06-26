import nodeWebSocketLib from "websocket";
import {RelayServer} from "./RelayServer.js";

const CHANNEL_NAME = "op2026";

let channel;

/**
 * chirimentestサーバーのCHANNEL_NAMEチャンネルに接続し、channelからのメッセージをconsoleに出力
*/
async function connect() {
    let relay = RelayServer("chirimentest", "chirimenSocket", nodeWebSocketLib, "https://chirimen.org");
    channel = await relay.subscribe(CHANNEL_NAME);
    channel.onmessage = msg => console.log(msg.data);
    channel.send("PiZero: web socketリレーサービスに接続しました");
}

connect();
