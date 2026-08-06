import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getPgPool, readJSONFile, writeJSONFile } from "./databaseService.js";

export interface DBUserRecord {
  id: string;
  username: string;
  password_hash: string;
  salt?: string;
  name: string;
  email: string;
  role: "admin" | "operations" | "editor";
  avatar: string;
  created_at: string;
  updated_at?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "ai_ecommerce_jwt_secret_key_2026";
const USERS_FILE = "users.json";

// Initialize Admin User in Database
export async function seedAdminUser(): Promise<void> {
  const adminUser = (process.env.ADMIN_USER || "admin").trim().toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  const adminEmail = process.env.ADMIN_EMAIL || `${adminUser}@ecom-ai.com`;

  const passwordHash = bcrypt.hashSync(adminPass, 10);
  const now = new Date().toISOString();

  const defaultAdmin: DBUserRecord = {
    id: "usr-admin-01",
    username: adminUser,
    password_hash: passwordHash,
    salt: "bcrypt",
    name: "System Director (Admin)",
    email: adminEmail,
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    created_at: now,
    updated_at: now,
  };

  const pool = getPgPool();
  if (pool) {
    try {
      const res = await pool.query(
        "SELECT id FROM users WHERE LOWER(username) = $1 OR role = 'admin'",
        [adminUser]
      );
      if (res.rows.length > 0) {
        const targetId = res.rows[0].id;
        await pool.query(
          `UPDATE users 
           SET username = $1, password_hash = $2, salt = $3, email = $4, updated_at = NOW()
           WHERE id = $5`,
          [adminUser, passwordHash, "bcrypt", adminEmail, targetId]
        );
        console.log(`[AUTH-DB] Upserted admin user (${adminUser}) credentials in PostgreSQL.`);
      } else {
        await pool.query(
          `INSERT INTO users (id, username, password_hash, salt, name, email, role, avatar, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            defaultAdmin.id,
            defaultAdmin.username,
            defaultAdmin.password_hash,
            defaultAdmin.salt,
            defaultAdmin.name,
            defaultAdmin.email,
            defaultAdmin.role,
            defaultAdmin.avatar
          ]
        );
        console.log(`[AUTH-DB] Initialized default admin user (${adminUser}) in PostgreSQL with bcrypt encryption.`);
      }
    } catch (err: any) {
      console.warn("[AUTH-DB] Failed to seed admin in PostgreSQL, falling back to file storage:", err.message);
    }
  }

  // Always keep JSON storage in sync with Upsert logic
  const localUsers = readJSONFile<DBUserRecord[]>(USERS_FILE, []);
  const existingIdx = localUsers.findIndex(
    u => u.username.toLowerCase() === adminUser || u.role === "admin"
  );
  if (existingIdx !== -1) {
    localUsers[existingIdx].username = adminUser;
    localUsers[existingIdx].password_hash = passwordHash;
    localUsers[existingIdx].email = adminEmail;
    localUsers[existingIdx].salt = "bcrypt";
    localUsers[existingIdx].updated_at = now;
  } else {
    localUsers.push(defaultAdmin);
  }
  writeJSONFile(USERS_FILE, localUsers);
}

// Find user by Username or Email from DB/File
export async function findUserByUsernameOrEmail(identifier: string): Promise<DBUserRecord | null> {
  const clean = identifier.trim().toLowerCase();
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        "SELECT id, username, password_hash, salt, name, email, role, avatar, created_at FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1",
        [clean]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          username: row.username,
          password_hash: row.password_hash,
          salt: row.salt,
          name: row.name,
          email: row.email,
          role: row.role as any,
          avatar: row.avatar,
          created_at: row.created_at,
        };
      }
    } catch (err: any) {
      console.warn("[AUTH-DB] PostgreSQL query user error, using fallback file storage:", err.message);
    }
  }

  // Fallback file storage
  const localUsers = readJSONFile<DBUserRecord[]>(USERS_FILE, []);
  const found = localUsers.find(u => u.username.toLowerCase() === clean || (u.email && u.email.toLowerCase() === clean));
  return found || null;
}

// Register or Create User in DB
export async function createUserInDB(userData: {
  username: string;
  passwordRaw: string;
  email: string;
  name?: string;
  role?: "admin" | "operations" | "editor";
}): Promise<DBUserRecord> {
  const cleanUsername = userData.username.trim().toLowerCase();
  const cleanEmail = userData.email.trim().toLowerCase();
  const passwordHash = bcrypt.hashSync(userData.passwordRaw, 10);
  const id = "usr-" + crypto.randomBytes(8).toString("hex");
  const now = new Date().toISOString();

  const newUser: DBUserRecord = {
    id,
    username: cleanUsername,
    password_hash: passwordHash,
    salt: "bcrypt",
    name: userData.name || cleanUsername.toUpperCase() + " (Operation User)",
    email: cleanEmail,
    role: userData.role || "operations",
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80`,
    created_at: now,
    updated_at: now,
  };

  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO users (id, username, password_hash, salt, name, email, role, avatar, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          newUser.id,
          newUser.username,
          newUser.password_hash,
          newUser.salt,
          newUser.name,
          newUser.email,
          newUser.role,
          newUser.avatar
        ]
      );
    } catch (err: any) {
      console.warn("[AUTH-DB] PostgreSQL insert user failed, persisting locally:", err.message);
    }
  }

  // Update file storage
  const localUsers = readJSONFile<DBUserRecord[]>(USERS_FILE, []);
  localUsers.push(newUser);
  writeJSONFile(USERS_FILE, localUsers);

  return newUser;
}

// Verify Password using bcrypt or fallback
export function verifyUserPassword(passwordRaw: string, passwordHash: string, salt?: string): boolean {
  if (salt === "bcrypt" || passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$")) {
    return bcrypt.compareSync(passwordRaw, passwordHash);
  }
  // PBKDF2 Legacy fallback check
  if (salt && salt !== "bcrypt") {
    const testHash = crypto.pbkdf2Sync(passwordRaw, salt, 1000, 64, "sha512").toString("hex");
    return testHash === passwordHash;
  }
  return bcrypt.compareSync(passwordRaw, passwordHash);
}

// Generate JWT Token
export function generateJWTToken(user: DBUserRecord): string {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Verify JWT Token
export function verifyJWTToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Update Admin Credentials in DB and File Storage
export async function updateAdminCredentials(
  userId: string,
  newUsername?: string,
  newPasswordRaw?: string
): Promise<DBUserRecord> {
  const pool = getPgPool();
  const localUsers = readJSONFile<DBUserRecord[]>(USERS_FILE, []);
  let userIndex = localUsers.findIndex(u => u.id === userId || u.role === "admin" || u.username === "admin");

  if (userIndex === -1 && localUsers.length > 0) {
    userIndex = 0;
  }

  let existingUser: DBUserRecord;
  if (userIndex >= 0) {
    existingUser = localUsers[userIndex];
  } else {
    existingUser = {
      id: userId || "usr-admin-01",
      username: "admin",
      password_hash: bcrypt.hashSync("admin123", 10),
      salt: "bcrypt",
      name: "E-Com Director (Admin)",
      email: "admin@ecom-ai.com",
      role: "admin",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      created_at: new Date().toISOString()
    };
    localUsers.push(existingUser);
    userIndex = localUsers.length - 1;
  }

  if (newUsername && newUsername.trim()) {
    existingUser.username = newUsername.trim().toLowerCase();
  }
  if (newPasswordRaw && newPasswordRaw.trim()) {
    existingUser.password_hash = bcrypt.hashSync(newPasswordRaw.trim(), 10);
    existingUser.salt = "bcrypt";
  }
  existingUser.updated_at = new Date().toISOString();

  localUsers[userIndex] = existingUser;
  writeJSONFile(USERS_FILE, localUsers);

  if (pool) {
    try {
      await pool.query(
        `UPDATE users SET username = $1, password_hash = $2, salt = $3, updated_at = NOW() WHERE id = $4 OR role = 'admin'`,
        [existingUser.username, existingUser.password_hash, existingUser.salt, existingUser.id]
      );
    } catch (err: any) {
      console.warn("[AUTH-DB] PostgreSQL update admin credentials error:", err.message);
    }
  }

  return existingUser;
}

