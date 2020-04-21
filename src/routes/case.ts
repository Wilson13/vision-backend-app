import express from "express";
import * as caseController from "../controllers/case";
import { verifyJwt } from "../utils/auth_helper";
const router = express.Router();

/* GET cases listing from database. */
router.get("/", verifyJwt(), caseController.getCases());

router.delete("/:uid", verifyJwt(), caseController.deleteCase());

export default router;
