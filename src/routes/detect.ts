import express from "express";
import multer from "multer";
import * as detectController from "../controllers/detect";
import { HTTP_BAD_REQUEST } from "../utils/constants";
import { CustomError } from "../utils/helper";
const router = express.Router();
const maxSize = 2 * 1000 * 1000; // 2 MB

const storage = multer.diskStorage({
  destination: "/tmp/",
  // destination: "./uploads/",
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb("Not an image! Please upload an image.", false);
  }
};

const upload = multer({
  // dest: "/tmp/",
  storage: storage,
  fileFilter: multerFilter,
  // limits: { fileSize: maxSize },
}).single("image");

router.post(
  "/",
  upload,
  // notificationController.validate(),
  detectController.detectObject()
);

export default router;
