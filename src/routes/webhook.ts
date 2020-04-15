import express from "express";
import * as webhookController from "../controllers/webhook";

const router = express.Router();

/* GET access token. */
// webhook does not require API token
router.post("/login", webhookController.receiveVerificationCode());

export default router;
