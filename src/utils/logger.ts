import winston from "winston";
//process environment for PROD would be set to error, this is shortcut for demo

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL,
  transports: [new winston.transports.Console()],
});
