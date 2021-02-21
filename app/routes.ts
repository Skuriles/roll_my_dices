import { Router } from "express";
import { Db } from "./db";

export class Routes {
  router = Router();
  db: Db;

  constructor(db: Db) {
    this.db = db;
    this.router.route("/login").post((req, res) => db.login(req, res));
    this.router
      .route("/checkUserId")
      .post((req, res) => db.checkUserId(req, res));
    this.router.route("/logout").post((req, res) => db.logout(req, res));
    this.router
      .route("/leaveTable")
      .post((req, res) => db.leaveTable(req, res));
    this.router
      .route("/getPlayers")
      .post((req, res) => db.getPlayers(req, res));
    this.router
      .route("/getPlayersFromTable")
      .post((req, res) => db.reqGetPlayersFromTable(req, res));
    this.router
      .route("/createPlayer")
      .post((req, res) => db.createPlayer(req, res));
    this.router
      .route("/checkTable")
      .post((req, res) => db.checkTable(req, res));
    this.router.route("/getTables").post((req, res) => db.getTables(req, res));
    this.router.route("/getTable").post((req, res) => db.getTable(req, res));
    this.router.route("/addTable").post((req, res) => db.addTable(req, res));
    this.router.route("/removeTable").post((req, res) => db.addTable(req, res));
    this.router.route("/addPlayer").post((req, res) => db.addTable(req, res));
    this.router
      .route("/removePlayer")
      .post((req, res) => db.removePlayer(req, res));
    this.router.route("/lockTable").post((req, res) => db.addTable(req, res));
  }
  // router.route('/').get((req, res) =>  db.start(req,res));
  // router.route('*').get((req, res) =>  db.start(req,res));
}
