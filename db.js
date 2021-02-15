const low = require("lowdb");
const lodashId = require("lodash-id");
const FileSync = require("lowdb/adapters/FileSync");
var Table = require("./table");
var Player = require("./player");
const adapter = new FileSync("db.json");
const db = low(adapter);
const bcrypt = require("bcrypt");
const saltRounds = 10;

db._.mixin(lodashId);

db.defaults({ tables: [], players: [] }).write();

module.exports = {
  createPlayer: (req, res) => {
    var name = req.body.name;
    var pw = req.body.pw;
    var exist = db.get("players").find({ name }).value();
    if (exist) {
      res.send(null);
      return;
    }
    bcrypt.hash(pw, saltRounds, (err, hash) => {
      if (err) {
        res.send(null);
      }
      var player = new Player(name, hash);
      var newPlayer = db.get("players").insert(player).write();
      res.send({ id: newPlayer.id });
    });
  },

  login: (req, res) => {
    var name = req.body.name;
    var pw = req.body.pw;
    var exist = db.get("players").find({ name }).value();
    if (exist) {
      bcrypt.compare(pw, exist.pw, (err, result) => {
        if (result) {
          res.send({ id: exist.id });
        }
        return;
      });
    } else {
      res.send(false);
    }
  },

  checkUserId: (req, res) => {
    var id = req.body.id;
    var exist = db.get("players").find({ id }).value();
    if (exist) {
      res.send(true);
    } else {
      res.send(false);
    }
  },

  getPlayers: (req, res) => {
    var players = db.get("players").value();
    res.send(players);
  },

  getTables: (req, res) => {
    var tables = db.get("tables").value();
    if (tables && tables.length > 0) {
      for (const table of tables) {
        table.names = [];
        for (const player of table.players) {
          var pl = db.get("players").getById(player).value();
          if (pl) {
            table.names.push(pl.name);
          }
        }
      }
    }
    res.send(tables);
  },

  getTable: (req, res) => {
    var id = req.body.id;
    var table = db.get("tables").getById(id).value();
    if (table) {
      table.names = [];
      for (const player of table.players) {
        var pl = db.get("players").getById(player).value();
        if (pl) {
          table.names.push(pl.name);
        }
      }
    }
    res.send(table);
  },

  checkTable: (req, res) => {
    var id = req.body.id;
    var playerId = req.body.playerId;
    var table = db.get("tables").getById(id).value();
    var player = db.get("players").getById(playerId).value();
    var access = player && table && table.maxplayers > table.players.length;
    if (access) {
      addPlayer(id, playerId);
    }
    res.send(access);
  },

  addTable: (req, res) => {
    var body = req.body.table;
    var playerId = req.body.playerId;
    var table = new Table(body.name, body.maxplayers, body.minplayers);
    var newTable = db.get("tables").insert(table).write();
    addPlayer(newTable.id, playerId);
    res.send(newTable);
  },

  lockTable: (req, res) => {
    var body = req.body;
    db.get("tables").find({ id: body.id }).set("locked", body.lock).write();
    res.end();
  },

  removeTable: (req, res) => {
    var body = req.body;
    db.get("tables").remove({ id: body.id }).write();
    res.end();
  },

  removePlayer: (req, res) => {
    var body = req.body;
    db.get("tables")
      .getById(body.id)
      .get("players")
      .remove(body.player)
      .write();
    res.end();
  },

  logout: (req, res) => {
    var id = req.body.id;
    deletePlayer(id);
    res.end();
  },

  leaveTable: (req, res) => {
    var id = req.body.playerId;
    removePlayerFromTable(id);
    res.end();
  },

  getTableFromPlayerId: (playerId) => {
    var tables = db.get("tables").value();
    for (const table of tables) {
      for (const player of table.players) {
        if (player.id == playerId) {
          return table.id;
        }
      }
    }
  },

  getPlayersFromTable: (tableId) => {
    var players = [];
    var table = db.get("tables").getById(tableId).value();
    for (const player of table.players) {
      players.push(player.id);
    }
    return players;
  },
};

var addPlayer = (id, player) => {
  var players = db.get("tables").getById(id).get("players");
  for (const pl of players.value()) {
    if (player == pl.id) {
      return;
    }
  }
  var pl = db.get("players").getById(player).value();
  players.push(pl).write();
};

var deletePlayer = (id) => {
  var tables = db.get("tables").value();
  for (const table of tables) {
    db.get("tables")
      .getById(table.id)
      .get("players")
      .remove((item) => item.id == id)
      .write();
  }
  db.get("players").remove({ id }).write();
};

var removePlayerFromTable = (id) => {
  var tables = db.get("tables").value();
  for (const table of tables) {
    db.get("tables")
      .getById(table.id)
      .get("players")
      .remove((item) => item.id == id)
      .write();
  }
};
