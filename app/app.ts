import express = require("express");
import http = require("http");
import { Routes } from "./routes";
import { Db } from "./db";
import path = require("path");
import { Gamehandler } from "./gamehandler";
import { WebsocketHandler } from "./websockethandler";

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
    this.db.removeAllPlayersFromTable();
  }

  newPlayerAtTable(playerId: string, tableId: string): void {
    this.websocketHandler.newPlayerAtTable(playerId, tableId);
  }
  removePlayerFromTable(playerId: string): void {
    this.websocketHandler.removePlayerFromTable(playerId);
  }
}

const myApp = new BaseApp();
