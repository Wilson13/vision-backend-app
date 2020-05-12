import express from "express";
import * as userController from "../controllers/user";
import { verifyJwt } from "../utils/auth_helper";
import upload from "../utils/upload_handler";
//verifyJwt
const router = express.Router();

/* GET users listing. */
//router.get('/', verifyJwt(), userController.getUsers());//asyncHandler(getUsers));
router.get("/", verifyJwt(), userController.getUsers()); //asyncHandler(getUsers));

/* Create new user */
router.post("/", verifyJwt(), userController.createUser());

/* Search for user */
router.post("/search", verifyJwt(), userController.searchUser());

/* Create new user case */
router.post("/:uid/case", verifyJwt(), userController.createCase());

/* Upload user's photo */
router.post(
  "/:uid/photo",
  upload.single("image"),
  verifyJwt(),
  userController.uploadUserPhoto()
);

/* Get user's photo */
router.get("/:uid/photo", verifyJwt(), userController.getUserPhoto());

/* Update existing user */
router.patch("/:uid", verifyJwt(), userController.updateUser());

/* Delete existing user */
router.delete("/:uid", verifyJwt(), userController.deleteUser());

//module.exports = router;
export default router;
