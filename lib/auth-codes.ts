import fs from "fs";
import path from "path";
import crypto from "crypto";

const FILE = path.join(process.cwd(), "data", "auth-codes.json");
const TTL_MS = 15 * 60 * 1000;

type VerifyEntry = {
  code: string;
  password: string;
  firstName: string;
  expiresAt: string;
};

type ResetEntry = {
  code: string;
  expiresAt: string;
};

type Store = {
  verify: Record<string, VerifyEntry>;
  reset: Record<string, ResetEntry>;
};

function emptyStore(): Store {
  return { verify: {}, reset: {} };
}

function readStore(): Store {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw) as Store;
    return {
      verify: parsed.verify ?? {},
      reset: parsed.reset ?? {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store), { mode: 0o600 });
}

function sixDigit(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function alive(iso: string): boolean {
  return new Date(iso).getTime() > Date.now();
}

export function saveVerifyCode(email: string, password: string, firstName: string): string {
  const store = readStore();
  const code = sixDigit();
  store.verify[email.toLowerCase()] = {
    code,
    password,
    firstName,
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  };
  writeStore(store);
  return code;
}

export function getVerifyRecord(email: string, code: string): { password: string; firstName: string } | null {
  const key = email.toLowerCase();
  const store = readStore();
  const row = store.verify[key];
  if (!row || row.code !== code || !alive(row.expiresAt)) return null;
  return { password: row.password, firstName: row.firstName };
}

export function deleteVerifyCode(email: string) {
  const store = readStore();
  delete store.verify[email.toLowerCase()];
  writeStore(store);
}

export function saveResetCode(email: string): string {
  const store = readStore();
  const code = sixDigit();
  store.reset[email.toLowerCase()] = {
    code,
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  };
  writeStore(store);
  return code;
}

export function peekResetCode(email: string, code: string): boolean {
  const key = email.toLowerCase();
  const store = readStore();
  const row = store.reset[key];
  return Boolean(row && row.code === code && alive(row.expiresAt));
}

export function consumeResetCode(email: string): void {
  const store = readStore();
  delete store.reset[email.toLowerCase()];
  writeStore(store);
}
