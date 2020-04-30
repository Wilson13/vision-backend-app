import express from "express";
import * as userController from "../controllers/user";
import { verifyJwt } from "../utils/auth_helper";
//verifyJwt
const router = express.Router();

/* GET users listing. */
//router.get('/', verifyJwt(), userController.getUsers());//asyncHandler(getUsers));
router.get("/", verifyJwt(), userController.getUsers()); //asyncHandler(getUsers));

router.post("/", verifyJwt(), userController.createUser());

router.post("/search", verifyJwt(), userController.searchUser());

router.post("/:uid/case", verifyJwt(), userController.createCase());

router.patch("/:uid", verifyJwt(), userController.updateUser());

router.delete("/:uid", verifyJwt(), userController.deleteUser());

//module.exports = router;
export default router;
