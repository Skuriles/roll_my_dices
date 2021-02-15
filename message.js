module.exports = class Message {
  constructor(content, params, isBroadcast, sender) {
    this.content = content;
    this.params = params;
    this.isBroadcast = isBroadcast;
    this.sender = sender;
  }
};
