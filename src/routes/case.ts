import express from "express";
import * as caseController from "../controllers/case";
import { verifyJwt } from "../utils/auth_helper";
const router = express.Router();

/* GET cases listing from database. */
router.get("/", verifyJwt(), caseController.getCases());

/* Assign case to a kiosk manager */
router.patch("/:uid/assign", verifyJwt(), caseController.assignCase());

/* Close case with status */
router.patch("/:uid", verifyJwt(), caseController.closeCase());

router.delete("/:uid", verifyJwt(), caseController.deleteCase());

export default router;
