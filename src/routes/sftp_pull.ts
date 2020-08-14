import express from "express";
import * as sftpPullController from "../controllers/sftp_pull";
const router = express.Router();

router.get("/showIP", sftpPullController.showIP());

router.get("/checkNewFile", sftpPullController.checkNewFile());

export default router;
