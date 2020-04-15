import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import fs from "fs";

import { generateKeyPairSync, KeyPairSyncResult } from "crypto";
import Key from "../models/key";
import asyncHandler from "./async_handler";
import { HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED } from "./constants";
import { RequestHandler } from "express";
// import logger from "./logger";

/**
 * Function for securing API endpoints that require API key (for developers).
 * This function call is not stateless because there's a DB call to find developer's ID.
 */
export function verifyAPIKey(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    let bearerToken;

    // Check and get bearer token
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    )
      bearerToken = req.headers.authorization.split(" ")[1];
    else
      return next(
        createHttpError(HTTP_UNAUTHORIZED, "Bearer token is required")
      );

    // Check and retrieve developer's ID (paired with private/public key pair)
    if (!req.query.developerId)
      return next(
        createHttpError(
          HTTP_BAD_REQUEST,
          "Query parameter 'developerId' is required"
        )
      );

    const developerId = req.query.developerId;
    const key = await Key.findOne({ developerId: developerId });

    if (!key)
      return next(
        createHttpError(
          HTTP_BAD_REQUEST,
          "No developer found with developerId: " + developerId
        )
      );

    // Join array to form keys
    // const privateKey = key.private.join("\n");
    const publicKey = key.public.join("\n");

    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ["RS256"], // an array
    };

    // Verify token
    try {
      const verifiedResult = jwt.verify(bearerToken, publicKey, verifyOptions);
      //let verifiedResult = true;

      // const signOptions = {
      //   algorithm: "RS256"
      // };

      // TODO: Need to generate token for new developers
      // const jwtToken = jwt.sign({'developerId': developerId}, privateKey, signOptions);
      // console.log("Developer jwtToken: " + jwtToken);
      //console.log(verifiedResult);

      if (verifiedResult["developerId"] == developerId) next();
      // continue to create next middleware
      else
        return next(
          createHttpError(
            HTTP_UNAUTHORIZED,
            "Invalid bearer token payload provided"
          )
        );
    } catch (err) {
      return next(createHttpError(HTTP_UNAUTHORIZED, err));
    }
  });
}

/**
 * TODO: Redis blacklist
 * By right, this will not be used because resource server and auth server
 * will have a shared public key for verification of token,
 * storing token with expiry date is no longer required, and JWT can remain stateless.
 *
 * However, in order to revoke tokens, the use of JWT has to become stateful.
 * Blacklisted tokens are stored in Redis and look up is required for every call now.
 *
 * This is better than querying from DB.
 */

// Function for securing API endpoints that require Bearer token (for users).
// When acting as, or being a resource server, there should be a machanism for saving the public key.
export function verifyJwt(): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    let bearerToken;

    // Check and get bearer token
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    )
      bearerToken = req.headers.authorization.split(" ")[1];
    else
      return next(
        createHttpError(HTTP_UNAUTHORIZED, "Bearer token is required")
      );

    // Load public key
    const publicKey = fs.readFileSync("./public.key", "utf8");

    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ["RS256"], // an array
    };

    // Verify token
    try {
      jwt.verify(bearerToken, publicKey, verifyOptions);
      next(); // continue to create next middleware
    } catch (err) {
      return next(createHttpError(HTTP_UNAUTHORIZED, err));
    }
  });
}

export async function generateRsaKeyPair(): Promise<
  KeyPairSyncResult<string, string>
> {
  const key = generateKeyPairSync("rsa", {
    modulusLength: 512,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
      // cipher: 'aes-256-cbc'
      //passphrase: process.env.RSA_PASS_PHRASE
    },
  });
  return key;
}

/**
 * Error must be try/catch when calling this function.
 * JWT will be unique/different when expires datetime changed or id changed
 * @param privateKey
 * @param identifier label for the "id" payload in JWT, currently used with "id" for normal user and "developerId" for developer restricted API calls
 * @param id identifer for JWT
 *  */
export async function generateJwt(
  privateKey,
  identifier,
  id,
  validity
): Promise<string> {
  const signOptions: jwt.SignOptions = {
    algorithm: "RS256",
    expiresIn: validity, // secs
  };

  if (validity <= 0) {
    delete signOptions.expiresIn;
  }

  return jwt.sign({ [identifier]: id }, privateKey, signOptions);
}
