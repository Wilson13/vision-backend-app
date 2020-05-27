// import * as httpError from 'http-errors';
// import cookieParser from "cookie-parser";

import express from "express";
import createHttpError from "http-errors";
import * as path from "path";
import logger from "morgan";
import healthcheck from "express-healthcheck";
import helmet from "helmet"; // Secure Express app by setting various HTTP headers.

// import log from "./utils/logger";
import errorResponse from "./utils/error_json";

// import indexRouter from "./routes/index";
// import usersRouter from "./routes/user";
import caseRouter from "./routes/case";
// import kioskManagerRouter from "./routes/kiosk_manager";
// import phonesRouter from "./routes/phone";
// import kioskPhonesRouter from "./routes/kiosk_phone";
// import webhookRouter from "./routes/webhook";
// import faceRouter from "./routes/face";

import {
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  PRODUCTION_ENV,
  STAGING_ENV,
} from "./utils/constants";

const nodeEnv = process.env.NODE_ENV;
if (!(nodeEnv === PRODUCTION_ENV || nodeEnv === STAGING_ENV)) {
  // set up .env variables
  require("dotenv").config();
}

// Load env variables
// loadEnv(__dirname + '/config/config.txt');

// Set up DB connection
require("./utils/database");

// Seed DB if it's not in production or staging ENV
// if (!(nodeEnv === PRODUCTION_ENV || nodeEnv === STAGING_ENV)) {
//   seedDB();
// }

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routers
// app.use("/", indexRouter);
// app.use("/face", faceRouter);
// app.use("/user", usersRouter);
app.use("/case", caseRouter);
// app.use("/phone", phonesRouter);
// app.use("/kiosk/manager", kioskManagerRouter);
// app.use("/kiosk/phone", kioskPhonesRouter);
// app.use("/webhook", webhookRouter);
app.use("/healthcheck", healthcheck());

// This is placed here in case no handler was found for that
// URI path (404 not found, which will then be caught by this).
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createHttpError(HTTP_NOT_FOUND));
});

// error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "dev" ? err : {};

  // render the error page
  const errorStatus = err.status || HTTP_INTERNAL_SERVER_ERROR;
  res.status(errorStatus);
  //res.render('error');

  res.json(errorResponse(errorStatus, err.message, err.data));
});

export default app;
