import WebSocket = require("ws");
import { Message } from "./message";
import http = require("http");
import { IExtWebSocket } from "./IWebsocket";
import { PlayerClient } from "./playerClient";
import { Player } from "./player";
import { Table } from "./table";
// import { GameHandler } from "./gamehandler";
import { Db } from "./db";

export class WebsocketHandler {
  CLIENTS: PlayerClient[] = [];
  wss: WebSocket.Server;
  interval: NodeJS.Timeout;
  db: Db;

  constructor(server: http.Server, db: Db) {
    this.db = db;
    this.wss = new WebSocket.Server({ server });
    this.setListener();
    this.interval = this.setPingInterval();
  }

  setListener(): void {
    this.wss.on("close", () => {
      this.wss.clients.forEach((client) => {
        this.removeClient(client);
      });
      clearInterval(this.interval);
    });

    this.wss.on("connection", (ws: IExtWebSocket) => {
      ws.isAlive = true;
      ws.on("message", (msg: string) => {
        this.handleMessage(msg, ws);
      });
      // send immediatly a feedback to the incoming connection
      ws.send(this.createMessage("connected"));

      ws.on("error", (err) => {
        this.removeClient(ws);
        console.warn(`Client disconnected - reason: ${err}`);
      });
    });
  }

  handleMessage(msg: string, ws: IExtWebSocket): void {
    const message: Message = JSON.parse(msg);
    if (message.isBroadcast) {
      // send back the message to the other clients
      this.wss.clients.forEach((client: WebSocket) => {
        if (client !== ws) {
          client.send(
            this.createMessage(message.content, [], true, message.sender)
          );
        }
      });
    }
    switch (message.content) {
      case "pong":
        this.heartbeat(ws);
        break;
      case "result":
        this.handleDiceResult(message, ws);
        break;
      case "register":
        this.handleRegister(message, ws);
        break;
      case "openCups":
        this.handleOpenCups(message, ws);
        break;
      case "newGame":
        this.handleNewGame(message.params, ws);
        break;
      default:
        break;
    }
  }

  handleNewGame(params: string[], ws: IExtWebSocket): void {
    const tableId: string = params[0];
    const table: Table = this.db.getTableSingle(tableId);
    // gamehandler.createGameFromNewTable(table, params[1], []);
  }

  handleOpenCups(message: Message, ws: IExtWebSocket): void {
    let dice: number | string = 0;
    let count: number | string = 0;
    let tableId: number | string = "";
    for (let i: number = 0; i < message.params.length; i++) {
      const param: number | string = message.params[i];
      if (i === 0) {
        dice = param;
      }
      if (i === 1) {
        count = param;
      }
      if (i === 2) {
        tableId = param;
      }
      // ameHandler.openCups(dice, count, tableId);
      // this.db.openCups();
    }
  }

  handleRegister(message: Message, ws: IExtWebSocket): void {
    const playerId: string = message.sender;
    for (const client of this.CLIENTS) {
      if (client.playerId === playerId) {
        return;
      }
    }
    this.CLIENTS.push(new PlayerClient(playerId, ws));
  }

  handleDiceResult(message: Message, ws: IExtWebSocket): void {
    const tableId: string = message.params[0];
    const table: Table = this.db.getTableSingle(tableId);
    const players: Player[] = this.db.getPlayersFromTable(tableId);
    const dices: number[] = [];
    for (const param of message.params) {
      dices.push(param);
    }
    table.getDiceResult(message.sender, message.params, players);
    this.wss.clients.forEach((client) => {
      if (client !== ws) {
        if (this.isValidPlayer(client, players)) {
          client.send(this.createMessage("playerResult", [message.sender]));
        }
      }
    });
  }

  createMessage(
    content: string,
    params: any[] = [],
    isBroadcast: boolean = false,
    sender: string = "NS"
  ): string {
    return JSON.stringify(new Message(content, params, isBroadcast, sender));
  }

  heartbeat(ws: IExtWebSocket): void {
    ws.isAlive = true;
  }

  setPingInterval(): NodeJS.Timeout {
    return setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const wsEx: IExtWebSocket = ws as IExtWebSocket;
        if (wsEx.isAlive === false) {
          this.removeClient(ws);
          return ws.terminate();
        }
        wsEx.isAlive = false;
        wsEx.send(this.createMessage("ping", [], false));
      });
    }, 30000);
  }

  removeClient(ws: WebSocket): void {
    for (let i: number = 0; i < this.CLIENTS.length; i++) {
      const ele: PlayerClient = this.CLIENTS[i];
      if (ele.client === ws) {
        this.db.removePlayerFromTable(ele.playerId);
        this.wss.clients.forEach((client) => {
          if (client !== ws) {
            client.send(this.createMessage("playerOffline", [ele.playerId]));
          }
        });
        this.CLIENTS.splice(i, 1);
        break;
      }
    }
  }

  isValidPlayer(client: WebSocket, players: Player[]): boolean {
    for (const ws of this.CLIENTS) {
      for (const player of players) {
        if (ws.playerId === player.id) {
          return true;
        }
      }
    }
    return false;
  }

  newPlayerAtTable(playerId: string, tableId: string): void {
    const players: Player[] = this.db.getPlayersFromTable(tableId);
    this.wss.clients.forEach((client) => {
      if (this.isValidPlayer(client, players)) {
        client.send(this.createMessage("newPlayer", [playerId, tableId]));
      }
    });
  }

  removePlayerFromTable(tableId: string): void {
    const players: Player[] = this.db.getPlayersFromTable(tableId);
    this.wss.clients.forEach((client) => {
      client.send(this.createMessage("playerOffline", [tableId]));
    });
  }
}
