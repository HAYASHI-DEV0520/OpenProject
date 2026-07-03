import {RelayServer} from "https://www.chirimen.org/remote-connection/js/beta/RelayServer.js";

const CHANNEL_NAME = "op2026-TTE";

let channel;

let onGetRideTimeCallback = null;

function onMessageObject(msgData) {
    const type = msgData.type.slice(3);
    switch(type) {
        case "getRideTime": {
            onGetRideTimeCallback?.(new Date(msgData.content.currentTime));
            return;
        }
    }
}

// chirimentestサーバのCHANNEL_NAMEチャンネルに接続し、onmessageを設定する
export async function connect(){
	let relay = RelayServer("chirimentest", "chirimenSocket" );
	channel = await relay.subscribe(CHANNEL_NAME);
    channel.send("PC: web socketリレーサービスに接続しました");
    channel.onmessage = msg => {
        if (msg === null) return;

        let data = msg.data;

        console.log(`[receive]: ${JSON.stringify(data)}`);
        if (typeof data === "object" 
            && "type" in data
            && "content" in data
            && data.type.startsWith("pc."))
            onMessageObject(data); 
    }
}

export async function sendMessage(msg) {
    channel.send(msg);
}

export function onGetRideTime(callback) {
    onGetRideTimeCallback = callback;
}
