#!/usr/bin/env node
/**
 * ESSA – encrypt a DB password into the format the backend expects.
 *
 * The backend (src/config/dbConfig.ts) decrypts DB_PASSWORD using AES-256-CBC,
 * with the key derived as sha256(DB_ENCRYPTION_KEY), and expects the value in
 * the form  "ivHex:encryptedHex". This script produces exactly that.
 *
 * USAGE:
 *   node encrypt-db-password.js "<plainDbPassword>" "<encryptionKey>"
 *
 * Then in vp-be-essa/.env.dev set:
 *   DB_PASSWORD=<the value printed by this script>
 *   DB_ENCRYPTION_KEY=<the same encryptionKey you passed here>
 */
const crypto = require("crypto");

const [, , plain, secret] = process.argv;

if (!plain || !secret) {
  console.error('Usage: node encrypt-db-password.js "<plainDbPassword>" "<encryptionKey>"');
  process.exit(1);
}

const algorithm = "aes-256-cbc";
const key = crypto.createHash("sha256").update(secret).digest(); // 32 bytes
const iv = crypto.randomBytes(16);                               // 16 bytes

const cipher = crypto.createCipheriv(algorithm, key, iv);
let encrypted = cipher.update(Buffer.from(plain, "utf8"));
encrypted = Buffer.concat([encrypted, cipher.final()]);

const value = iv.toString("hex") + ":" + encrypted.toString("hex");

console.log("\nDB_PASSWORD=" + value);
console.log("DB_ENCRYPTION_KEY=" + secret + "\n");
console.log("Paste both lines into vp-be-essa/.env.dev");
