import { Db } from "./db";
import { Player } from "./player";
import { Table } from "./table";

export class Gamehandler {
  db: Db;
  constructor(db: Db) {
    this.db = db;
  }
  //   openCups(dice: number, count: number) : void {
  //   for (const game of GAMES) {
  //     if (game.game.id == gameId) {
  //       game.game.openCups(dice, count, players);
  //     }
  //   }
  // }
}
