import express from "express";
import multer from "multer";
import * as detectController from "../controllers/detect";
const router = express.Router();

const maxSize = 1 * 1024 * 614.4; // 1MB
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
  limits: { fileSize: maxSize },
}).single("image");

router.post(
  "/",
  upload,
  // notificationController.validate(),
  detectController.detectObject()
);

router.post(
  "/test",
  // upload,
  // notificationController.validate(),
  detectController.detectObjectAssetImage()
);

export default router;
