import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Router, type IRouter } from "express";
import {
  GetPulseConfigResponse,
  ListPulseActivityResponse,
  RunPulseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const execFileAsync = promisify(execFile);
const projectRoot =
  [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../.."),
  ].find((candidate) => existsSync(path.join(candidate, "index.js"))) ??
  process.cwd();
const activityLogPath = path.join(projectRoot, "activity_log.txt");
const pulseScriptPath = path.join(projectRoot, "index.js");

type ActivityEntry = {
  timestamp: string;
  status: string;
  message: string;
};

function parseActivityLine(line: string): ActivityEntry | null {
  const match = line.match(/^(\S+)\s+-\s+status:\s+(\S+)\s*$/);
  if (!match) {
    return null;
  }

  const [, timestamp, status] = match;
  const parsedTimestamp = new Date(timestamp);
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return null;
  }

  return {
    timestamp: parsedTimestamp.toISOString(),
    status,
    message: status === "success" ? "Activity log updated successfully" : "Pulse run completed",
  };
}

async function readActivityEntries(): Promise<ActivityEntry[]> {
  try {
    const contents = await readFile(activityLogPath, "utf8");
    return contents
      .split(/\r?\n/)
      .map(parseActivityLine)
      .filter((entry): entry is ActivityEntry => entry !== null)
      .reverse();
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function buildSummary(entries: ActivityEntry[]) {
  const successfulRuns = entries.filter((entry) => entry.status === "success").length;
  const latest = entries[0];

  return {
    totalRuns: entries.length,
    successfulRuns,
    failedRuns: entries.length - successfulRuns,
    lastRunAt: latest?.timestamp ?? null,
    lastStatus: latest?.status ?? null,
  };
}

router.get("/pulse/activity", async (req, res): Promise<void> => {
  try {
    const entries = await readActivityEntries();
    res.json(
      ListPulseActivityResponse.parse({
        entries,
        summary: buildSummary(entries),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Unable to read ProfilePulse activity");
    res.status(500).json({ error: "Unable to read activity log" });
  }
});

router.post("/pulse/run", async (req, res): Promise<void> => {
  try {
    await execFileAsync(process.execPath, [pulseScriptPath], {
      cwd: projectRoot,
    });
    const entries = await readActivityEntries();
    const entry = entries[0];

    if (!entry) {
      res.status(500).json({ error: "Pulse completed without creating an activity entry" });
      return;
    }

    res.status(201).json(
      RunPulseResponse.parse({
        entry,
        summary: buildSummary(entries),
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "ProfilePulse run failed");
    res.status(500).json({ error: "ProfilePulse run failed" });
  }
});

router.get("/pulse/config", (_req, res): void => {
  res.json(
    GetPulseConfigResponse.parse({
      schedule: "0 9 * * *",
      scheduleLabel: "Daily at 09:00 UTC",
      workflowFile: ".github/workflows/pulse.yml",
      commitMessage: "chore(pulse): automated sync check [skip ci]",
      gitIdentity: "github-actions[bot]",
      permissions: "contents: write",
      manualTrigger: true,
    }),
  );
});

export default router;