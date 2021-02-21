import { Table } from "./table";

export class PlayerTable {
  table: Table;
  plNames: string[];

  constructor() {
    this.table = new Table("", 0, 0, 0);
    this.plNames = [];
  }
}
