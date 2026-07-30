import { getPgPool, readJSONFile, writeJSONFile } from "../db/databaseService";

export interface SystemLogEntry {
  id: string;
  type: "gemini" | "groq" | "siliconflow" | "openrouter" | "woocommerce" | "system" | string;
  action: string;
  target?: string;
  status: "success" | "error";
  httpCode?: number;
  latencyMs: number;
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
  createdAt: string;
}

const LOGS_FILE = "system_logs.json";
const MAX_LOGS_CACHE = 200;

let cachedLogs: SystemLogEntry[] = readJSONFile<SystemLogEntry[]>(LOGS_FILE, []);

export function addSystemLog(entry: Omit<SystemLogEntry, "id" | "createdAt">): SystemLogEntry {
  const newLog: SystemLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
  };

  cachedLogs.unshift(newLog);
  if (cachedLogs.length > MAX_LOGS_CACHE) {
    cachedLogs = cachedLogs.slice(0, MAX_LOGS_CACHE);
  }

  writeJSONFile(LOGS_FILE, cachedLogs);

  // Background persist to PostgreSQL if pool is available
  const pool = getPgPool();
  if (pool) {
    pool.query(
      `INSERT INTO system_logs (id, type, action, target, status, http_code, latency_ms, request_payload, response_payload, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        newLog.id,
        newLog.type,
        newLog.action,
        newLog.target || null,
        newLog.status,
        newLog.httpCode || null,
        newLog.latencyMs,
        newLog.requestPayload ? JSON.stringify(newLog.requestPayload) : null,
        newLog.responsePayload ? JSON.stringify(newLog.responsePayload) : null,
        newLog.errorMessage || null,
        newLog.createdAt,
      ]
    ).catch(err => {
      console.warn("[Logger] Error inserting log into PostgreSQL:", err.message);
    });
  }

  return newLog;
}

export function getSystemLogs(filters?: {
  type?: string;
  status?: string;
  limit?: number;
}): SystemLogEntry[] {
  let result = [...cachedLogs];
  if (filters?.type && filters.type !== "all") {
    result = result.filter(l => l.type === filters.type);
  }
  if (filters?.status && filters.status !== "all") {
    result = result.filter(l => l.status === filters.status);
  }
  const limit = filters?.limit || 100;
  return result.slice(0, limit);
}

export function clearSystemLogs(): void {
  cachedLogs = [];
  writeJSONFile(LOGS_FILE, []);
  const pool = getPgPool();
  if (pool) {
    pool.query("DELETE FROM system_logs").catch(err => {
      console.warn("[Logger] Error clearing PostgreSQL system_logs table:", err.message);
    });
  }
}
