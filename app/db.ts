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
import { Message } from "./message";
import { RoundResult } from "./roundResult";

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

  resetAfterStart() {
    this.removeAllPlayersFromTable();
    this.resetTableValues();
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

  getPlayerById(playerId: string): Player {
    return this.db.get("players").getById(playerId).value();
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

  startGame(req: Request, res: Response): void {
    const tableId: string = req.body.tableId;
    const table = this.db.get("tables").getById(tableId);
    this.db.get("tables").getById(tableId).assign({ started: true }).write();
    const players = this.getPlayersFromTable(tableId);
    for (const player of players) {
      this.db
        .get("players")
        .getById(player.id)
        .assign({ won: false, dices: table.diceCount });
    }
    this.baseApp.startGame(tableId);
    res.end();
  }

  nextRound(req: Request, res: Response): void {
    const tableId: string = req.body.tableId;
    let round = this.db.get("tables").getById(tableId).get("round").value();
    this.db
      .get("tables")
      .getById(tableId)
      .assign({ round: ++round, roundFinished: false })
      .write();
    const table: Table = this.db.get("tables").getById(tableId).value();
    table.waiting = true;
    res.send(table);
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
      this.db
        .get("players")
        .getById(player.id)
        .assign({
          diced: false,
          result: [],
          openCup: false,
          won: false,
          dices: 0,
        })
        .write();
      this.removePlayerFromTable(player.id);
    }
  }

  resetTableValues(): void {
    const tables: Table[] = this.db.get("tables").value();
    for (const table of tables) {
      this.db
        .get("tables")
        .getById(table.id)
        .assign({
          round: 1,
          started: false,
          waiting: true,
          roundFinished: false,
        })
        .write();
    }
  }

  getDiceResult(tableId: string, playerId: string, params: any[]): string[] {
    const players: Player[] = this.getPlayersFromTable(tableId);
    const dices: number[] = [];
    for (let i = 2; i < params.length; i++) {
      const element = params[i];
      dices.push(element);
    }
    let finished: boolean = true;
    for (const player of players) {
      if (player.id === playerId) {
        this.db
          .get("players")
          .getById(playerId)
          .assign({ diced: true, result: dices })
          .write();
        continue;
      }
      if (!player.diced) {
        finished = false;
      }
    }
    const table: Table = this.getTableSingle(tableId);
    if (finished) {
      this.db
        .get("tables")
        .getById(tableId)
        .assign({
          waiting: false,
        })
        .write();
      this.baseApp.allPlayersDiced(table.id, players);
    }
    return table.playerIds;
  }

  openCups(
    dice: number,
    count: number,
    fromPlayerId: string,
    tableId: string,
    playerRes: Player
  ): void {
    const players = this.getPlayersFromTable(tableId);
    const table = this.db
      .get("tables")
      .getById(tableId)
      .assign({ roundFinished: true })
      .write();
    let diceCount = 0;
    let fromPlayer: string = "";
    for (const player of players) {
      if (fromPlayerId === player.id) {
        fromPlayer = player.name;
        this.db
          .get("players")
          .getById(player.id)
          .assign({ openCup: true })
          .write();
      } else {
        let dices = this.db
          .get("players")
          .getById(player.id)
          .get("dices")
          .value();
        if (diceCount === 1) {
          this.db
            .get("players")
            .getById(player.id)
            .assign({ openCup: true, dices: --dices, won: true })
            .write();
        } else {
          this.db
            .get("players")
            .getById(player.id)
            .assign({ openCup: true, dices: --dices })
            .write();
        }
      }
      for (const di of player.result) {
        if (di === 1 || di === dice) {
          diceCount++;
        }
      }
    }
    const rResult = new RoundResult(
      diceCount >= count,
      diceCount,
      dice,
      count,
      playerRes.name
    );
    rResult.fromPlayer = fromPlayer;
    this.baseApp.sendRoundResult(rResult, players);
  }

  getTableSingle(tableId: string): Table {
    const table: Table = this.db.get("tables").getById(tableId).value();
    return table;
  }

  removePlayerFromTable(playerId: string): void {
    const tables: Table[] = this.db.get("tables").value();
    for (const table of tables) {
      for (const player of table.playerIds) {
        if (player === playerId) {
          this.baseApp.removePlayerFromTable(playerId);
        }
      }
      this.db
        .get("tables")
        .getById(table.id)
        .get("playerIds")
        .remove((item: string) => item === playerId)
        .write();
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
    this.baseApp.newPlayerAtTable(pl.id, pl.name, tableVal.id);
  }

  deletePlayer(playerId: string): void {
    this.removePlayerFromTable(playerId);
    this.db.get("players").remove({ id: playerId }).write();
  }
}
