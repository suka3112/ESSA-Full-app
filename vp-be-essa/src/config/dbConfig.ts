import crypto from "crypto";

const algorithm = "aes-256-cbc";

// Decrypt function that matches your encryption logic
function decrypt(encryptedText: string, secret: string) {
  if (!encryptedText || !secret) {
    throw new Error("Missing encrypted password or secret key");
  }

  // Convert secret to a 32-byte key (same as in encrypt script)
  const key = crypto.createHash("sha256").update(secret).digest();

  // Split iv and encrypted data
  const [ivHex, encryptedHex] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedBuffer = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export const dbConfig = {
  username: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD?.includes(":")
    ? decrypt(process.env.DB_PASSWORD, process.env.DB_ENCRYPTION_KEY || "")
    : process.env.DB_PASSWORD,
  database: process.env.DATABASE_NAME,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    // Postgres (node-pg) — do not pass MSSQL `options` here; pg will try to
    // serialize that object into the startup packet and crash.
    // ssl: { require: true, rejectUnauthorized: false },
    // OCR extract + batch persistence can exceed 30s for multi-section PDFs.
    statement_timeout: parseInt(
      process.env.DB_REQUEST_TIMEOUT_MS || "1800000",
      10,
    ),
  },
  pool: {
    max: 500,
    min: 30,
    acquire: 60000,
    idle: 10000,
  },
};
