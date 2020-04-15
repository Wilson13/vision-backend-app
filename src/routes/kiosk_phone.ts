import express from "express";
import * as kioskPhoneController from "../controllers/kiosk_phone";
import { verifyAPIKey } from "../utils/auth_helper";
//verifyJwt
const router = express.Router();

/* GET phones listing. */
router.get("/", verifyAPIKey(), kioskPhoneController.getKioskPhone());

router.post("/", verifyAPIKey(), kioskPhoneController.createKioskPhones());

router.delete("/", verifyAPIKey(), kioskPhoneController.deleteKioskPhones());

//module.exports = router;
export default router;
