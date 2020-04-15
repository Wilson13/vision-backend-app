import express from "express";
const router = express.Router();

/* GET home page. */
router.get("/", function (req, res) {
  res.render("index", { title: "Express Auth Server v0.1.0-beta.6" });
});

export default router;
