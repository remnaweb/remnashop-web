import { spawn } from "node:child_process";
import crypto from "node:crypto";

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

function dollarQuote(value: string): string {
  const tag = `q${crypto.randomBytes(6).toString("hex")}`;
  return `$${tag}$${value}$${tag}$`;
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

async function runPsql(sql: string): Promise<string> {
  return dockerExec(
    ["exec", "-i", pgContainer(), "psql", "-U", pgUser(), "-d", pgDatabase(), "-v", "ON_ERROR_STOP=1"],
    sql
  );
}

export async function markEmailVerified(email: string): Promise<boolean> {
  try {
    const sql = `UPDATE users SET is_email_verified = true, pending_email = NULL WHERE lower(email) = ${dollarQuote(email.toLowerCase())};`;
    const stdout = await runPsql(sql);
    return /UPDATE\s+[1-9]\d*/.test(stdout);
  } catch (err) {
    console.error("markEmailVerified:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function markTelegramUserVerified(telegramId: number): Promise<boolean> {
  if (!telegramId) return false;
  try {
    const sql = `UPDATE users SET is_email_verified = true, pending_email = NULL WHERE telegram_id = ${telegramId};`;
    const stdout = await runPsql(sql);
    return /UPDATE\s+[1-9]\d*/.test(stdout);
  } catch (err) {
    console.error("markTelegramUserVerified:", err instanceof Error ? err.message : err);
    return false;
  }
}
