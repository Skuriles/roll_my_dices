var db = require("./db");
var http = require("http");
const express = require("express");
var routes = require("./routes");
var path = require("path");
const app = express();
var WebSocket = require("ws");
var Message = require("./message");
const port = 63555;
CLIENTS = [];

var server = http.createServer(app);
app.use(express.json());
app.use("/api", routes);
app.use("/", express.static(path.join(__dirname, "public")));

var wss = new WebSocket.Server({ server });

function createMessage(
  content,
  params = [],
  isBroadcast = false,
  sender = "NS"
) {
  return JSON.stringify(new Message(content, params, isBroadcast, sender));
}

function noop() {}

function heartbeat() {
  this.isAlive = true;
}

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.send(createMessage("ping", false));
  });
}, 30000);

wss.on("close", function close() {
  wss.clients.forEach((client) => {
    removeClient(client);
  });
  clearInterval(interval);
});

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", heartbeat);
  ws.on("message", (msg) => {
    const message = JSON.parse(msg);
    if (message.isBroadcast) {
      //send back the message to the other clients
      wss.clients.forEach((client) => {
        if (client != ws) {
          client.send(createMessage(message.content, true, message.sender));
        }
      });
    }
    switch (message.content) {
      case "result":
        var tableId = message.sender;
        var players = db.getPlayersFromTable(tableId);
        var dices = [];
        for (let i = 0; i < message.params.length; i++) {
          const param = message.params[i];
          dices.push(param);
        }
        wss.clients.forEach((client) => {
          if (client != ws) {
            if (isValidPlayer(client, players)) {
              client.send(createMessage("playerResult", message.params));
            }
          }
        });
        break;
      case "register":
        var id = message.sender;
        for (const client of CLIENTS) {
          if (client.id == id) {
            return;
          }
        }
        CLIENTS.push({ id, ws });
        break;
      default:
        break;
    }
  });

  //send immediatly a feedback to the incoming connection
  ws.send(createMessage("connected"));

  ws.on("error", (err) => {
    removeClient(ws);
    console.warn(`Client disconnected - reason: ${err}`);
  });
});

function removeClient(ws) {
  for (let i = 0; i < CLIENTS.length; i++) {
    const ele = CLIENTS[i];
    if (ele.ws == ws) {
      CLIENTS.splice(i, 1);
      break;
    }
  }
}

function isValidPlayer(client, players) {
  for (const ws of CLIENTS) {
    for (const player of players) {
      if (client == ws.ws && ws.id == player) {
        return true;
      }
    }
  }
  return false;
}

server.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
