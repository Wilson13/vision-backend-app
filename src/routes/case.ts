import express from "express";
import * as caseController from "../controllers/case";
const router = express.Router();

/* GET cases listing from database. */
router.get("/", caseController.getCases());

/* GET cases attachment from database. */
router.get("/:uid/attachments", caseController.getCasesAttachments());

/* Assign case to a kiosk manager */
router.post("/:uid/assign", caseController.assignCase());

/* Close case with status */
router.post("/:uid/close", caseController.closeCase());

/* Update case with category */
router.post("/:uid/categorize", caseController.categorizeCase());

router.delete("/:uid", caseController.deleteCase());

export default router;
