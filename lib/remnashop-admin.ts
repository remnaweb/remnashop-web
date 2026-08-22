import { spawn } from "node:child_process";

function dockerExec(args: string[], input?: string): Promise<string> {
  const bins = [process.env.DOCKER_BIN, "docker", "/usr/bin/docker"].filter(
    (bin, index, all): bin is string => Boolean(bin) && all.indexOf(bin) === index
  );

  function run(bin: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(bin, args, { env: process.env });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve(stdout);
        else reject(new Error(stderr.trim() || stdout.trim() || `${bin} exit ${code}`));
      });
      if (input !== undefined) child.stdin.end(input);
      else child.stdin.end();
    });
  }

  return bins.reduce<Promise<string>>(
    (chain, bin) => chain.catch(() => run(bin)),
    Promise.reject(new Error("no docker bin"))
  );
}

function pgUser(): string {
  return process.env.REMNASHOP_PG_USER ?? "remnashop";
}

function pgDatabase(): string {
  return process.env.REMNASHOP_PG_DATABASE ?? process.env.REMNASHOP_PG_DB ?? "remnashop";
}

function pgContainer(): string {
  return process.env.REMNASHOP_PG_CONTAINER ?? "remnashop-db";
}

const ADMIN_ROLES = new Set(["ADMIN", "DEV", "OWNER", "SYSTEM"]);
const ADMIN_ROLE_MIN = 3;

function isAdminRole(raw: string): boolean {
  const value = raw.trim().toUpperCase();
  if (!value) return false;
  if (ADMIN_ROLES.has(value)) return true;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) && asNumber >= ADMIN_ROLE_MIN;
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export async function isRemnashopAdmin(user: {
  telegram_id?: number | null;
  email?: string | null;
}): Promise<boolean> {
  const telegramId = user.telegram_id ? Number(user.telegram_id) : 0;
  const extra = (process.env.WEB_THEME_ADMIN_IDS ?? "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean);
  if (telegramId && extra.includes(telegramId)) return true;

  const clauses: string[] = [];
  if (telegramId) clauses.push(`telegram_id = ${telegramId}`);
  if (user.email) clauses.push(`lower(email) = lower(${sqlString(user.email)})`);
  if (!clauses.length) return false;

  try {
    const stdout = await dockerExec([
      "exec",
      "-i",
      pgContainer(),
      "psql",
      "-U",
      pgUser(),
      "-d",
      pgDatabase(),
      "-tA",
      "-c",
      `SELECT role::text FROM users WHERE ${clauses.join(" OR ")} LIMIT 1;`,
    ]);
    return isAdminRole(stdout);
  } catch (err) {
    console.error("isRemnashopAdmin:", err instanceof Error ? err.message : err);
    return Boolean(telegramId && extra.includes(telegramId));
  }
}
