/* eslint-disable @typescript-eslint/camelcase */
import { HTTP_CONFLICT } from "./constants";
import validator from "validator";

export function beautifyJSONString(value: string): string {
  return value.replace(/\\n|\"|\\/g, "");
}

export function apiResponse(
  status: number,
  message: string,
  data: object
): object {
  const jsonRes = {
    status: status,
    message: message,
    data: JSON.stringify(data),
  };

  return jsonRes;
}

export class CustomError extends Error {
  status: number;
  data: object;
  constructor(status: number, message: string, data: object) {
    super();
    this.status = status;
    this.message = message;
    this.data = data;
  }
}

export function handleSaveError(
  err,
  doc,
  next: (arg0?: CustomError) => void
): void {
  if (err.name === "MongoError" && err.code === 11000) {
    // According to RFC 7231, Conflicts are most likely to occur in
    // response to a PUT request but it's used for POST request too.
    const keys = Object.keys(err.keyValue);
    return next(
      new CustomError(
        HTTP_CONFLICT,
        `Duplicates found: '${keys[0]}'`,
        err.keyValue
        // doc
      )
    );
  } else {
    return next();
  }
}

export function validatePhone(phone: {
  countryCode: string;
  number: string;
}): { status: boolean; message: string } {
  const { countryCode, number } = phone;
  const result = { status: false, message: null };

  // Country Code
  if (!countryCode) {
    result.message = "phone.countryCode is required.";
  } else if (!validator.isNumeric(countryCode, { no_symbols: true }))
    result.message = "phone.countryCode can only be digits.";
  else if (!validator.isLength(countryCode, { min: 2, max: 2 }))
    result.message = "phone.countryCode needs to be 2-digit long.";
  // Number
  else if (!number) {
    result.message = "phone.number is required.";
  } else if (!validator.isNumeric(number, { no_symbols: true }))
    result.message = "phone.number can only be digits.";
  else if (!validator.isLength(number, { min: 8, max: 8 }))
    result.message = "phone.number needs to be 8-digit long.";
  else result.status = true;

  return result;
}

export function validateURI(
  uri: string,
  uriName: string
): {
  status: boolean;
  message: string;
} {
  const result = { status: false, message: null };

  if (!uri) {
    result.message = `${uriName} is required.`;
  } else if (!validator.isURL(uri)) {
    result.message = `${uriName} needs to be a valid URL.`;
  } else result.status = true;

  return result;
}
