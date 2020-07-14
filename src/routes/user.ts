import express from "express";
import * as userController from "../controllers/user";
import upload from "../utils/upload_handler";
//verifyJwt
const router = express.Router();

/* GET users listing. */
router.get("/", userController.getUsers());

/* Create user cases */
router.get("/:uid/cases", userController.getCases());

/* Create new user */
router.post("/", userController.createUser());

/* Search for user */
router.post("/search", userController.searchUser());

/* Create new user case */
router.post("/:uid/cases", userController.createCase());

/* Upload user's photo */
router.post(
  "/:uid/photo",
  upload.single("image"),
  userController.uploadUserPhoto()
);

/* Get user's photo */
router.get("/:uid/photo", userController.getUserPhoto());

/* Update existing user */
router.patch("/:uid", userController.updateUser());

/* Delete existing user */
router.delete("/:uid", userController.deleteUser());

//module.exports = router;
export default router;
