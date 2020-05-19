// Bad request http response code
export const HTTP_OK = 200;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_NOT_FOUND = 404;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_CONFLICT = 409;
export const HTTP_INTERNAL_SERVER_ERROR = 500;
export const GET_LIMIT = 100;
export const SALT_ROUNDS = 10;
export const PRODUCTION_ENV = "production";
export const STAGING_ENV = "staging";
export const DEVELOPMENT_ENV = "dev";
export const TEST_ENV = "test";
export const CASE_STATUS_OPEN = "open";
export const CASE_STATUS_PROCESSING = "processing";
export const CASE_STATUS_MINISTER = "minister";
export const CASE_STATUS_UNCONTACTABLE = "uncontactable";

export const ERROR_MSG_EMAIL = "email format is wrong";

export const ERROR_MSG_NAME = "name cannot be longer than 50 characters";

export const ERROR_MSG_RACE =
  "race has to be either of ['chinese'|'malay'|'indian'|'other']";

export const ERROR_MSG_GENDER = "gender has to be either ['male'|'female']";

export const ERROR_MSG_LANGUAGE =
  "language cannot be longer than 20 characters";

export const ERROR_MSG_NO_OF_CHILDREN =
  "noOfChildren cannot be alphabet or more than 20";

export const ERROR_MSG_MARITAL_STATUS =
  "maritalStatus has to be either of ['single'|'married'|'divorced']";

export const ERROR_MSG_POSTAL = "postal code has to be six-digit format";

export const ERROR_MSG_OCCUPATION =
  "occupation cannot be longer than 50 characters";

export const ERROR_MSG_PHONE_UPDATE = "phone cannot be updated for now";

export const ERROR_MSG_PHONE_COUNTRY =
  "phone.countryCode is required and has to be 2-digit long";

export const ERROR_MSG_PHONE_NUMBER =
  "phone.number is required and has to be 8-digit long";

export const ERROR_MSG_PHONE_NUMBER_FORMAT = "phone has to be 8-digit long";

export const ERROR_MSG_BLOCK_HOUSE_NO =
  "blockHseNo cannot be longer than 50 characters";

export const ERROR_MSG_FLOOR_NO = "floorNo cannot be longer than 20 characters";

export const ERROR_MSG_UNIT_NO = "unitNo cannot be longer than 10 characters";

export const ERROR_MSG_ADDRESS = "address cannot be longer than 50 characters";

export const ERROR_MSG_FLAT_TYPE =
  "flatType cannot be longer than 20 characters";

export const ERROR_UPDATE_FIELD =
  "otp, accessToken, verificationCode, authServer, uid cannot be modified";
