export class Player {
  id: string = "";
  diced = false;
  result: number[] = [];
  openCup = false;
  name: string;
  pw: string;
  constructor(name: string, pw: string) {
    this.name = name;
    this.pw = pw;
  }
}
