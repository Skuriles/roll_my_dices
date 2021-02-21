import { IExtWebSocket } from "./IWebsocket";

export class PlayerClient {
  playerId: string;
  client: IExtWebSocket;

  constructor(id: string, client: IExtWebSocket) {
    this.playerId = id;
    this.client = client;
  }
}
