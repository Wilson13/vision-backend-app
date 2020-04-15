import express from "express";
import * as phoneController from "../controllers/phone";
import { verifyAPIKey } from "../utils/auth_helper";
//verifyJwt
const router = express.Router();

/* GET phones listing. */
router.get("/", verifyAPIKey(), phoneController.getPhones());

router.post("/", verifyAPIKey(), phoneController.createPhones());

router.delete("/", verifyAPIKey(), phoneController.deletePhones());

//module.exports = router;
export default router;
