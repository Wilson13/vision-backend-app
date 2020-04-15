import express from "express";
import * as kioskManagerController from "../controllers/kiosk_manager";
import { verifyAPIKey } from "../utils/auth_helper";
//verifyJwt
const router = express.Router();

/* GET users listing. */
//router.get('/', verifyJwt(), userController.getUsers());//asyncHandler(getUsers));
router.get("/", verifyAPIKey(), kioskManagerController.getKioskManagers()); //asyncHandler(getUsers));

// Authorizing (signing in) does not require API token
router.post("/authorize", kioskManagerController.authorizeKioskManager());

router.delete("/", verifyAPIKey(), kioskManagerController.deleteKioskManager());

//module.exports = router;
export default router;
