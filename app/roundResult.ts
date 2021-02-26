export class RoundResult {
  public success: boolean;
  public diceCount: number;
  public dice: number;
  public playerName: string;
  public count: number;
  public fromPlayer: string = "";
  public gameFinished: boolean;

  constructor(
    success: boolean,
    diceCount: number,
    dice: number,
    count: number,
    name: string,
    gameFinished: boolean,
    fromPlayer: string
  ) {
    this.success = success;
    this.diceCount = diceCount;
    this.dice = dice;
    this.playerName = name;
    this.count = count;
    this.fromPlayer = fromPlayer;
    this.gameFinished = gameFinished;
  }
}
