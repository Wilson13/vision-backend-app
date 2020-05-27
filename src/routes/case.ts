import express from "express";
import * as caseController from "../controllers/case";
const router = express.Router();

/* GET cases listing from database. */
router.get("/", caseController.getCases());

/* Assign case to a kiosk manager */
router.patch("/:uid/assign", caseController.assignCase());

/* Close case with status */
router.patch("/:uid", caseController.closeCase());

router.delete("/:uid", caseController.deleteCase());

export default router;
