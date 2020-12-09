import express from "express";
import multer from "multer";
import * as notificationController from "../controllers/notification";
const router = express.Router();
const maxSize = 2 * 1000 * 1000; // 2 MB

const upload = multer({
  dest: "/tmp/",
  limits: { fileSize: maxSize },
});
router.post(
  "/",
  upload.single("attachment"),
  notificationController.sanitize(),
  notificationController.validate(),
  notificationController.sendNotification()
);

export default router;
