/**
 * This should only be run if it's not in prod environment.
 */

import key from "../models/key";
import authServer from "../models/auth_server";
import log from "../utils/logger";
import { DEVELOPMENT_ENV, STAGING_ENV, PRODUCTION_ENV } from "./constants";

export function seedDB(): void {
  key
    .create({
      public: [
        "-----BEGIN PUBLIC KEY-----",
        "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAJgIc/yo7Zgrs+GUgnEEQc2FppGm/kWn",
        "/ABNW9yajioo461KvWS6uyhozxfEHrx4/t1pHs8L01Tw9Q8Do/LMGm0CAwEAAQ==",
        "-----END PUBLIC KEY-----",
      ],
      private: [
        "-----BEGIN RSA PRIVATE KEY-----",
        "MIIBOQIBAAJBAJgIc/yo7Zgrs+GUgnEEQc2FppGm/kWn/ABNW9yajioo461KvWS6",
        "uyhozxfEHrx4/t1pHs8L01Tw9Q8Do/LMGm0CAwEAAQJAGJB9FRzCTuz4woD5VoNm",
        "kmt+z1fZC64ptG7LYeiDAeKag6zSQxL/DKvbHTWLNnRckLzetcPTj0st732+mn+7",
        "TQIhAO7Oz34bzsmHuJq7pixmweCiWCp4IUYax5KBSN7Cc9X7AiEAovplieUFId3t",
        "sHpelUgEja4JcvVN+tain0qyecD1LLcCIHx7TWmdMTOYDcCKpFpszg88UN0CdcXH",
        "W9Sgk82aaytVAiANyCrp/Enw0TmWYOK6sPphmMQHyqKrgZcC7WgmT6DsBQIgCiRv",
        "70vYMnMGN70CXN+cMuehZfwvoKynOKjIg9kOxK0=",
        "-----END RSA PRIVATE KEY-----",
      ],
      developerId: "wilson",
    })
    .catch((err) => {
      log.error("Seeder error: " + err);
    });
}
