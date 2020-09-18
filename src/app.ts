// import * as httpError from 'http-errors';
// import cookieParser from "cookie-parser";

import express from "express";
import createHttpError from "http-errors";
import * as path from "path";
import logger from "morgan";
import healthcheck from "express-healthcheck";
import helmet from "helmet"; // Secure Express app by setting various HTTP headers.
import dotenv from "dotenv";
import isEmpty from "validator/lib/isEmpty";

import errorResponse from "./utils/error_json";
import accountRouter from "./routes/account";
import notificationRouter from "./routes/notification";

import {
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  PRODUCTION_ENV,
  STAGING_ENV,
} from "./utils/constants";

const nodeEnv = process.env.NODE_ENV;
const basePath = process.env.BASE_PATH ? "/" + process.env.BASE_PATH : "";
if (!(nodeEnv === PRODUCTION_ENV || nodeEnv === STAGING_ENV)) {
  // set up .env variables
  dotenv.config();
}

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// parse application/json
app.use(logger("dev"));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routers
app.use(basePath + "/accounts", accountRouter);
app.use(basePath + "/notifications", notificationRouter);
// app.use("/webhook", webhookRouter);
app.use(basePath + "/healthcheck", healthcheck());

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

  res.send(errorResponse(errorStatus, err.message, err.data));
});

export default app;
