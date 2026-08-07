const fs = require("node:fs");
const path = require("node:path");

const activityLogPath = path.join(__dirname, "activity_log.txt");
const timestamp = new Date().toISOString();
const status = "success";
const entry = `${timestamp} - status: ${status}${require("node:os").EOL}`;

fs.appendFileSync(activityLogPath, entry, "utf8");
console.log(`ProfilePulse logged a ${status} run at ${timestamp}`);