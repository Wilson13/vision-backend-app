import mongoose from "mongoose";
import logger from "../utils/logger";
import { TEST_ENV, PRODUCTION_ENV } from "./constants";

mongoose.set("useCreateIndex", true);

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

  if (process.env.NODE_ENV != PRODUCTION_ENV) {
    logger.info("Node env:" + process.env.NODE_ENV);
    logger.info("Db uri: " + dbURI);
    logger.info("Db user: " + process.env.DB_USER);
    logger.info("Db password: " + process.env.DB_PASSWORD);
    logger.info("Db options: ", dbOptions);
    logger.info("AWS_ACCESS_KEY_ID: " + process.env.AWS_ACCESS_KEY_ID);
    logger.info("AWS_SECRET_ACCESS_KEY: " + process.env.AWS_SECRET_ACCESS_KEY);
    logger.info("AWS_REGION: " + process.env.AWS_REGION);
  }

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
