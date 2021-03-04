import { Player } from "./player";
import { Table } from "./table";

export class ChangedTable {
  constructor(public table: Table, public players: Player[]) {}
}
