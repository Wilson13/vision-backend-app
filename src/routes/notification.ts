import express from "express";
import * as notificationController from "../controllers/notification";
const router = express.Router();

router.post(
  "/",
  notificationController.sanitize(),
  notificationController.validate(),
  notificationController.sendNotification()
);

export default router;
