#!/usr/bin/env node
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-use-before-define */

/**
 * Module dependencies.
 */
import app from "../app";
import serverless from "serverless-http";

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Listen on provided port, on all network interfaces.
 */
// server.listen(port);
// server.on("error", onError);
// server.on("listening", onListening);
module.exports.handler = serverless(app);
