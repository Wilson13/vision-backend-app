import fs from "fs";
import path from "path";

const ENCODING = "utf8"; // string
const NEWLINE = "\n";
const EQUALS = "=";

/** NOT IN USED FOR NOW **/
export function loadEnv(configPath) {
  const filePath = path.resolve(process.cwd(), configPath);
  const content = fs.readFileSync(filePath, ENCODING);
  const arr = content.split(NEWLINE);
  console.log(arr);
  content.split(NEWLINE).map(splitAndLoadByEquals);
}

function splitAndLoadByEquals(data) {
  const dataTrimmed = data.trim();
  const arr = dataTrimmed.split(EQUALS);
  process.env[arr[0]] = arr[1];
}
