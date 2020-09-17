// ISO 8601 format (yyyy-MM-ddThh:mm+hh) regex (+hh is UTC+hh:mm, e.g. UTC+08:00 for SGT)
export const isoDateRegex = /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)$/;

export function beautifyJSONString(value: string): string {
  return value.replace(/\\n|\"|\\/g, "");
}

export function apiResponse(
  status: number,
  // message: string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  data: object
): string {
  const jsonRes = {
    status: status,
    // message: message,
    data: data,
  };

  const jsonStr = JSON.stringify(jsonRes);
  // return JSON.parse(jsonStr);
  return jsonStr;
}

export class CustomError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(status: number, message: string, data: Record<string, unknown>) {
    super();
    this.status = status;
    this.message = message;
    this.data = data;
  }
}
