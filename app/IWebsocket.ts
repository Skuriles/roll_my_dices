import WebSocket = require("ws");

export interface IExtWebSocket extends WebSocket {
  isAlive: boolean;
}
