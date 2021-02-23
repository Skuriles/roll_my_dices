export class Player {
  id: string = "";
  diced = false;
  result: number[] = [];
  dices: number = 0;
  openCup = false;
  name: string;
  pw: string;
  won: boolean = false;
  constructor(name: string, pw: string) {
    this.name = name;
    this.pw = pw;
  }
}
