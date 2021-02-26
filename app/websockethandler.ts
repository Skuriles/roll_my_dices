import WebSocket = require("ws");
import { Message } from "./message";
import http = require("http");
import { IExtWebSocket } from "./IWebsocket";
import { PlayerClient } from "./playerClient";
import { Player } from "./player";
import { RoundResult } from "./roundResult";
// import { GameHandler } from "./gamehandler";
import { Db } from "./db";
import { PlayerTable } from "./playerTable";
import { Table } from "./table";

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
      default:
        break;
    }
  }

  handleOpenCups(message: Message, ws: IExtWebSocket): void {
    const dice: number = message.params[0];
    const count: number = message.params[1];
    const fromPlayerId: string = message.params[2];
    const tableId: string = message.params[3];
    const playerId: string = message.params[4];
    this.db.openCups(dice, count, fromPlayerId, tableId, playerId);
  }

  sendRoundResult(res: RoundResult, players: Player[]) {
    this.wss.clients.forEach((client) => {
      if (
        this.isValidPlayer(
          client,
          players.map((p) => p.id)
        )
      ) {
        client.send(
          this.createMessage("sendRoundResult", [
            res.success,
            res.diceCount,
            res.dice,
            res.count,
            res.playerName,
            res.fromPlayer,
            res.gameFinished,
          ])
        );
      }
    });
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
    const playerIds = this.db.getDiceResult(
      message.params[0],
      message.params[1],
      message.params
    );

    this.wss.clients.forEach((client) => {
      if (this.isValidPlayer(client, playerIds)) {
        client.send(this.createMessage("playerResult", [message.sender]));
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

  isValidPlayer(client: WebSocket, playerIds: string[]): boolean {
    for (const ws of this.CLIENTS) {
      for (const plId of playerIds) {
        if (ws.playerId === plId) {
          return true;
        }
      }
    }
    return false;
  }

  newPlayerAtTable(
    playerId: string,
    playerName: string,
    tableId: string
  ): void {
    const players: Player[] = this.db.getPlayersFromTable(tableId);
    this.wss.clients.forEach((client) => {
      if (
        this.isValidPlayer(
          client,
          players.map((p) => p.id)
        )
      ) {
        client.send(
          this.createMessage("newPlayer", [playerId, playerName, tableId])
        );
      }
    });
  }

  removePlayerFromTable(playerId: string): void {
    this.wss.clients.forEach((client) => {
      client.send(this.createMessage("playerOffline", [playerId]));
    });
  }

  startGame(tableId: string) {
    this.wss.clients.forEach((client) => {
      client.send(this.createMessage("gameStarted", [tableId]));
    });
  }

  allPlayersDiced(tableId: string, players: Player[]) {
    this.wss.clients.forEach((client) => {
      if (
        this.isValidPlayer(
          client,
          players.map((p) => p.id)
        )
      ) {
        client.send(this.createMessage("allPlayersDiced", [tableId]));
      }
    });
  }

  nextRound(table: Table) {
    const players = this.db.getPlayersFromTable(table.id);
    this.wss.clients.forEach((client) => {
      if (
        this.isValidPlayer(
          client,
          players.map((p) => p.id)
        )
      ) {
        client.send(this.createMessage("newRound", [table]));
      }
    });
  }

  playerFinished(players: Player[]) {
    this.wss.clients.forEach((client) => {
      if (
        this.isValidPlayer(
          client,
          players.map((p) => p.id)
        )
      ) {
        client.send(this.createMessage("playerFinished", [players]));
      }
    });
  }

  gameFinished(tableId: string, players: Player[]) {
    this.wss.clients.forEach((client) => {
      if (
        this.isValidPlayer(
          client,
          players.map((p) => p.id)
        )
      ) {
        client.send(this.createMessage("gameFinished", [tableId]));
      }
    });
  }
}
