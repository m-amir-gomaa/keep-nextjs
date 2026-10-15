import { createHash, randomBytes } from "node:crypto";

export const makeRecoveryKey = () => randomBytes(32).toString("base64url");
export const recoveryHash = (key: string) => createHash("sha256").update(key).digest("hex");
export const validRecoveryKey = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{43}$/.test(value);
