import { Player } from "./player";

export class Table {
  id = "";
  name: string;
  maxplayers: number;
  minplayers: number;
  locked: boolean;
  diceCount: number;
  round: number;
  started: boolean;
  playerIds: string[];
  waiting: boolean;
  roundFinished: boolean;
  constructor(
    name: string,
    maxplayers: number,
    minplayers: number,
    diceCount: number
  ) {
    this.name = name;
    this.maxplayers = maxplayers;
    this.minplayers = minplayers;
    this.locked = false;
    this.diceCount = diceCount;
    this.round = 1;
    this.started = false;
    this.playerIds = [];
    this.waiting = true;
    this.roundFinished = false;
  }

  // playRound = () => {
  //   this.round++;
  //   for (const player of this.playerIds) {
  //     player.diced = false;
  //     player.result = [];
  //     player.openCup = false;
  //   }
  //   this.waiting = true;
  // };
}
