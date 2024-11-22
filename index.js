const WebSocket = require("ws");
const {spawn} = require('child_process')

const getWsUrl = async () => {
    const res = await fetch("http://localhost:31337/json");
    const j = await res.json();
    return j.find((i) => i.url.includes("app.gather.town"))?.webSocketDebuggerUrl;
}

const inject = async () => {
    const wsUrl = await getWsUrl()

    console.log("connecting to", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.on("open", () => {
        console.log("Connected to DevTools Protocol");

        const command = {
            id: 1,
            method: "Runtime.evaluate",
            params: {
                expression: `
                console.log("starting")
    const audio = new Audio('https://cdn.freesound.org/previews/20/20553_102580-lq.mp3');
    const distanceThreshold = 1;
    const nearUsers = [];

    game.subscribeToEvent("playerMoves", (data, context) => {
      const uid = context?.player?.id;
      const myUid = game.engine.clientUid;
      if (uid === myUid) return;

      const otherX = context?.player?.x || 9999;
      const otherY = context?.player?.y || 9999;

      const meX = game.players[myUid]?.x || -9999;
      const meY = game.players[myUid]?.y || -9999;

      const diffX = Math.abs(meX - otherX);
      const diffY = Math.abs(meY - otherY);
      const length = Math.sqrt(diffX * diffX + diffY * diffY);
      if (length > distanceThreshold + 1) {
        delete nearUsers[uid];
        return;
      }

      if (nearUsers[uid]) return;
      nearUsers[uid] = true;
      audio.play();
    });
    console.log("success")
    `,
            },
        };

        ws.send(JSON.stringify(command));
    })
}

const main = async () => {
    const command = spawn(`/Applications/Gather.app/Contents/MacOS/Gather`, [`--remote-debugging-port=31337`, `--remote-allow-origins=http://localhost:31337`])
    command.stdout.on('data', (data) => {
        if (data.toString().includes("Successfully connected to chat server")) {
            inject()
        }
    });

    command.on('close', (code) => {
        console.log(`Process exited with code: ${code}`);
    });
}

main();
