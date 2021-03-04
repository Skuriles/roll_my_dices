import express = require("express");
import http = require("http");
import { Routes } from "./routes";
import { Db } from "./db";
import path = require("path");
import { Gamehandler } from "./gamehandler";
import { WebsocketHandler } from "./websockethandler";
import { Player } from "./player";
import { RoundResult } from "./roundResult";
import { Table } from "./table";

export class BaseApp {
  db: Db;
  app: express.Application = express();

  readonly port: number = 63555;
  server: http.Server = http.createServer(this.app);
  websocketHandler: WebsocketHandler;
  constructor() {
    this.db = new Db(this);
    this.app.use(express.json());
    const routes: Routes = new Routes(this.db);
    this.app.use("/", express.static(path.join(__dirname, "public")));
    this.app.use("/api", routes.router);
    this.server = http.createServer(this.app);
    this.websocketHandler = new WebsocketHandler(this.server, this.db);
    this.server.listen(this.port, () => {
      console.log(`Server up and running at http://localhost:${this.port}`);
    });
    this.cleanOut();
  }

  cleanOut(): void {
    this.db.resetAfterStart();
  }

  newPlayerAtTable(
    playerId: string,
    playerName: string,
    tableId: string
  ): void {
    this.websocketHandler.newPlayerAtTable(playerId, playerName, tableId);
  }
  removePlayerFromTable(playerId: string): void {
    this.websocketHandler.removePlayerFromTable(playerId);
  }

  startGame(tableId: string) {
    this.websocketHandler.startGame(tableId);
  }

  allPlayersDiced(tableId: string, players: Player[]) {
    this.websocketHandler.allPlayersDiced(tableId, players);
  }

  sendRoundResult(res: RoundResult, players: Player[]) {
    this.websocketHandler.sendRoundResult(res, players);
  }

  newRound(table: Table) {
    this.websocketHandler.nextRound(table);
  }

  playerIsFinished(players: Player[]) {
    this.websocketHandler.playerFinished(players);
  }

  sendGameFinished(tableId: string, players: Player[]) {
    this.websocketHandler.gameFinished(tableId, players);
  }

  sendTableLocked(tableId: string, lock: boolean) {
    this.websocketHandler.tableLocked(tableId, lock);
  }

  sendTableCorrection(tableId: string) {
    this.websocketHandler.tableCorrection(tableId);
  }
}

const myApp = new BaseApp();
