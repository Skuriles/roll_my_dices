import lowDb = require("lowdb");
// tslint:disable-next-line
const lodashId = require("lodash-id");
import FileSync = require("lowdb/adapters/FileSync");
import { Table } from "./table";
import { Player } from "./player";
import { Gamehandler } from "./gamehandler";
import bcrypt = require("bcrypt");
import { BaseApp } from "./app.js";
import { Request, Response } from "express";
import { PlayerTable } from "./playerTable";

type Schema = {
  tables: Table[];
  players: Player[];
};

export class Db {
  adapter: lowDb.AdapterSync;
  db: any;
  saltRounds = 10;
  gameHandler: Gamehandler;
  baseApp: BaseApp;

  constructor(baseApp: BaseApp) {
    this.baseApp = baseApp;
    this.gameHandler = new Gamehandler(this);
    this.adapter = new FileSync<Schema>("db.json");
    this.db = lowDb(this.adapter);
    this.db._.mixin(lodashId);
    this.db.defaults({ tables: [], players: [] }).write();
  }

  createPlayer(req: Request, res: Response): void {
    const name: string = req.body.name;
    const pw: string = req.body.pw;
    const exist: Player = this.db.get("players").find({ name }).value();
    if (exist) {
      res.send(null);
      return;
    }
    bcrypt.hash(pw, this.saltRounds, (err, hash) => {
      if (err) {
        res.send(null);
      }
      const player: Player = new Player(name, hash);
      const newPlayer: Player = this.db.get("players").insert(player).write();
      res.send({ id: newPlayer.id });
    });
  }

  login(req: Request, res: Response): void {
    const name: string = req.body.name;
    const pw: string = req.body.pw;
    const exist: Player = this.db.get("players").find({ name }).value();
    if (exist) {
      bcrypt.compare(pw, exist.pw, (err, result) => {
        if (result) {
          res.send({ id: exist.id });
        }
        return;
      });
    } else {
      res.send(false);
    }
  }

  checkUserId(req: Request, res: Response): void {
    const id: string = req.body.id;
    const exist: Player = this.db.get("players").find({ id }).value();
    if (exist) {
      res.send(true);
    } else {
      res.send(false);
    }
  }

  getPlayers(req: Request, res: Response): void {
    const players: Player[] = this.db.get("players").value();
    res.send(players);
  }

  getTables(req: Request, res: Response): void {
    const tables: Table[] = this.db.get("tables").value();
    const playerTable: PlayerTable[] = [];
    if (tables && tables.length > 0) {
      for (const table of tables) {
        const plTable: PlayerTable = new PlayerTable();
        const players: Player[] = this.getPlayersFromTable(table.id);
        plTable.plNames = [];
        plTable.table = table;
        for (const player of players) {
          plTable.plNames.push(player.name);
        }
        playerTable.push(plTable);
      }
    }
    res.send(playerTable);
  }

  getTable(req: Request, res: Response): void {
    const tableId: string = req.body.id;
    const table: Table = this.getTableSingle(tableId);
    res.send(table);
  }

  // getAllTables: () => {
  //   return db.get("tables").value();
  // }

  checkTable(req: Request, res: Response): void {
    const tableId: string = req.body.id;
    const playerId: string = req.body.playerId;
    const table: Table = this.db.get("tables").getById(tableId).value();
    const player: Player = this.db.get("players").getById(playerId).value();
    const access: boolean =
      player && table && table.maxplayers > table.playerIds.length;
    if (access) {
      this.addPlayer(tableId, playerId);
    }
    res.send(access);
  }

  addTable(req: Request, res: Response): void {
    const body: Table = req.body.table;
    const playerId: string = req.body.playerId;
    const table: Table = new Table(
      body.name,
      body.maxplayers,
      body.minplayers,
      body.diceCount
    );
    const player: Player = this.db.get("players").getById(playerId).value();
    const newTable: Table = this.db.get("tables").insert(table).write();
    this.addPlayer(newTable.id, playerId);
    res.send(newTable);
  }

  lockTable(req: Request, res: Response): void {
    const body: Table = req.body;
    this.db
      .get("tables")
      .find({ id: body.id })
      .set("locked", body.locked)
      .write();
    res.end();
  }

  removeTable(req: Request, res: Response): void {
    const body: Table = req.body;
    this.db.get("tables").remove({ id: body.id }).write();
    res.end();
  }

  removePlayer(req: Request, res: Response): void {
    const tableId: string = req.body.id;
    const playerId: string = req.body.playerId;
    this.db
      .get("tables")
      .getById(tableId)
      .get("playerIds")
      .remove(playerId)
      .write();
    res.end();
  }

  logout(req: Request, res: Response): void {
    const playerId: string = req.body.id;
    this.deletePlayer(playerId);
    res.end();
  }

  leaveTable(req: Request, res: Response): void {
    const id: string = req.body.playerId;
    this.removePlayerFromTable(id);
    res.end();
  }

  reqGetPlayersFromTable(req: Request, res: Response): void {
    const id: string = req.body.playerId;
    const players = this.getPlayersFromTable(id);
    res.send(players);
  }

  getPlayersFromTable(tableId: string): Player[] {
    const players: Player[] = [];
    const table: Table = this.db.get("tables").getById(tableId).value();
    const allPlayers: Player[] = this.db.get("players").value();
    for (const player of allPlayers) {
      if (table.playerIds.indexOf(player.id) !== -1) {
        players.push(player);
      }
    }
    return players;
  }

  removeAllPlayersFromTable(): void {
    const players: Player[] = this.db.get("players").value();
    for (const player of players) {
      this.removePlayerFromTable(player.id);
    }
  }

  getTableSingle(tableId: string): Table {
    const table: Table = this.db.get("tables").getById(tableId).value();
    return table;
  }

  removePlayerFromTable(playerId: string): void {
    const tables: Table[] = this.db.get("tables").value();
    for (const table of tables) {
      this.db
        .get("tables")
        .getById(table.id)
        .get("playerIds")
        .remove((item: string) => item === playerId)
        .write();
      for (const player of table.playerIds) {
        if (player === playerId) {
          this.baseApp.removePlayerFromTable(table.id);
        }
      }
    }
  }

  addPlayer(tableId: string, playerId: string): void {
    const table = this.db.get("tables").getById(tableId);
    const tableVal: Table = table.value();
    if (table && tableVal.playerIds) {
      for (const id of tableVal.playerIds) {
        if (playerId === id) {
          return;
        }
      }
    }
    const pl: Player = this.db.get("players").getById(playerId).value();
    if (pl) {
      const plIds = table.get("playerIds");
      plIds.push(pl.id).write();
    }
    this.baseApp.newPlayerAtTable(pl.id, tableVal.id);
  }

  deletePlayer(playerId: string): void {
    this.removePlayerFromTable(playerId);
    this.db.get("players").remove({ id: playerId }).write();
  }
}
