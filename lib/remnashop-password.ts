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

async function hashWithRemnashop(password: string): Promise<string> {
  const container = process.env.REMNASHOP_APP_CONTAINER ?? "remnashop";
  const script = [
    "import hashlib, os, secrets, sys",
    "sys.path.insert(0, '/opt/remnashop')",
    "from src.core.constants import PASSWORD_SCRYPT_DKLEN, PASSWORD_SCRYPT_N, PASSWORD_SCRYPT_P, PASSWORD_SCRYPT_R",
    "from src.core.utils.encoding import b64url_encode",
    "pw = sys.stdin.read()",
    "key = os.environ['APP_CRYPT_KEY']",
    "salt = secrets.token_bytes(16)",
    "digest = hashlib.scrypt(f'{pw}:{key}'.encode('utf-8'), salt=salt, n=PASSWORD_SCRYPT_N, r=PASSWORD_SCRYPT_R, p=PASSWORD_SCRYPT_P, dklen=PASSWORD_SCRYPT_DKLEN)",
    "print(f'scrypt${PASSWORD_SCRYPT_N}${PASSWORD_SCRYPT_R}${PASSWORD_SCRYPT_P}${b64url_encode(salt)}${b64url_encode(digest)}', end='')",
  ].join("\n");

  const stdout = await dockerExec(["exec", "-i", "-w", "/opt/remnashop", container, "python", "-c", script], password);
  const hash = stdout.trim();
  if (!hash.startsWith("scrypt$")) {
    throw new Error("RemnaShop вернул некорректный хеш пароля");
  }
  return hash;
}

export async function emailUserExists(email: string): Promise<boolean> {
  try {
    const sql = `SELECT id FROM users WHERE lower(email) = ${dollarQuote(email.toLowerCase())} LIMIT 1;`;
    const stdout = await runPsql(sql);
    return /\d+/.test(stdout);
  } catch (err) {
    console.error("emailUserExists:", err instanceof Error ? err.message : err);
    return false;
  }
}

async function updateViaDocker(email: string, hash: string): Promise<boolean> {
  const sql = `UPDATE users SET password_hash = ${dollarQuote(hash)} WHERE lower(email) = ${dollarQuote(email.toLowerCase())};`;
  const stdout = await runPsql(sql);
  return /UPDATE\s+[1-9]\d*/.test(stdout);
}

export async function updateRemnashopPassword(email: string, password: string): Promise<boolean> {
  try {
    if (!(await emailUserExists(email))) {
      return false;
    }
    const hash = await hashWithRemnashop(password);
    return await updateViaDocker(email, hash);
  } catch (err) {
    console.error("updateRemnashopPassword:", err instanceof Error ? err.message : err);
    return false;
  }
}
