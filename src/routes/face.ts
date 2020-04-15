import express from "express";
import * as faceController from "../controllers/face";
import upload from "../utils/upload_handler";
import { verifyAPIKey } from "../utils/auth_helper";

const router = express.Router();

/* GET faces listing from database. */
router.get("/", verifyAPIKey(), faceController.getFaces());

/* GET Rekognition faces listing. */
router.get("/rekognition/", verifyAPIKey(), faceController.getRekFaces());

/* GET Rekognition collection listing. */
router.get("/collection", verifyAPIKey(), faceController.getRekCollection());

/* DELETE face in database and Rekognition. */
router.delete("/:phoneNumber/", verifyAPIKey(), faceController.deleteFace());

/* Detect user's face */
router.post(
  "/:phoneNumber/",
  upload.single("image"),
  faceController.detectFace()
);

/* Enroll user's face */
router.post("/", upload.single("image"), faceController.createFace());

export default router;
