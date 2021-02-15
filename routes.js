var express = require("express");
var router = express.Router();
var db = require("./db");

// router.route('/').get(db.start);
// router.route('*').get(db.start);
router.route("/login").post(db.login);
router.route("/checkUserId").post(db.checkUserId);
router.route("/logout").post(db.logout);
router.route("/leaveTable").post(db.leaveTable);
router.route("/getPlayers").post(db.getPlayers);
router.route("/createPlayer").post(db.createPlayer);
router.route("/checkTable").post(db.checkTable);
router.route("/getTables").post(db.getTables);
router.route("/getTable").post(db.getTable);
router.route("/addTable").post(db.addTable);
router.route("/removeTable").post(db.addTable);
router.route("/addPlayer").post(db.addTable);
router.route("/removePlayer").post(db.addTable);
router.route("/lockTable").post(db.addTable);

module.exports = router;
