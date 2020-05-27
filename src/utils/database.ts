import mongoose from "mongoose";
import logger from "../utils/logger";
import { TEST_ENV } from "./constants";

mongoose.set("useCreateIndex", true);
mongoose.set("useFindAndModify", false);

// Will not set up DB connection if it's just running tests.
if (process.env.NODE_ENV != TEST_ENV) {
  const dbOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD,
  };

  const dbURI = process.env.DB_URI;
  const db = mongoose.connection;

  mongoose
    .connect(dbURI, dbOptions)
    .catch((err) => logger.info("connect error: ", err));

  db.on("error", (err) => {
    logger.info("> error occurred from the database");
    logger.info("> error: ", err);
  });

  db.once("open", function () {
    logger.info("> successfully opened the database");
  });
}
module.exports = mongoose;
