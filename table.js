module.exports = class Table {
  id = 0;
  constructor(name, maxplayers, minplayers) {
    this.name = name;
    this.maxplayers = maxplayers;
    this.minplayers = minplayers;
    this.players = [];
    this.locked = false;
  }
};
