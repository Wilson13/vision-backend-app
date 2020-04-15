import express from "express";
import * as userController from "../controllers/user";
import { verifyAPIKey } from "../utils/auth_helper";
//verifyJwt
const router = express.Router();

/* GET users listing. */
//router.get('/', verifyJwt(), userController.getUsers());//asyncHandler(getUsers));
router.get("/", verifyAPIKey(), userController.getUsers()); //asyncHandler(getUsers));

router.post("/", verifyAPIKey(), userController.createUser());

router.delete("/", verifyAPIKey(), userController.deleteUser());

//module.exports = router;
export default router;
