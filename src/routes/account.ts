import express from "express";
import * as accountController from "../controllers/account";
const router = express.Router();

router.get(
  "/:accountName/balance",
  accountController.validate("getBalance"),
  accountController.getBalance()
);

router.post(
  "/:accountName/topups", // username must be an email
  accountController.sanitize(),
  accountController.validate("topUpBalance"),
  accountController.topUpBalance()
);

export default router;
