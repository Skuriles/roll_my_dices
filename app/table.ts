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
    this.started = true;
    this.playerIds = [];
    this.waiting = true;
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

  getDiceResult = (playerId: string, result: number[], players: Player[]) => {
    let finished: boolean = true;
    for (const player of players) {
      if (player.id === playerId) {
        player.diced = true;
        player.result = result;
      }
      if (!player.diced) {
        finished = false;
      }
    }
    if (finished) {
      this.setRoundDiced();
    }
  };

  setRoundDiced = () => {
    this.waiting = false;
  };

  openCups = (dice: number, count: number, players: Player[]) => {
    for (const player of players) {
      player.openCup = true;
    }
  };
}
