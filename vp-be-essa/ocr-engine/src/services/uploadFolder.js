import { mkdirSync, existsSync } from "fs";
import { rm } from "fs/promises";
import path from "path";

function formatUploadDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function randomFourDigitSuffix() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export function resolveUploadsDir() {
  const custom = process.env.UPLOADS_DIR?.trim();
  if (custom) return path.resolve(custom);
  return path.resolve(process.cwd(), "uploads");
}

/**
 * Create a unique processing folder for one upload.
 * Folder name format: upload_YYYYMMDD_XXXX (XXXX = random 4-digit suffix).
 * @param {Date} [now]
 */
export function createUploadFolder(now = new Date()) {
  const uploadsDir = resolveUploadsDir();
  mkdirSync(uploadsDir, { recursive: true });

  const dateStamp = formatUploadDate(now);
  let folderName = null;
  let folderPath = null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = randomFourDigitSuffix();
    const candidateName = `upload_${dateStamp}_${suffix}`;
    const candidatePath = path.join(uploadsDir, candidateName);

    if (!existsSync(candidatePath)) {
      folderName = candidateName;
      folderPath = candidatePath;
      break;
    }
  }

  if (!folderPath) {
    throw new Error("Could not allocate a unique upload folder.");
  }

  mkdirSync(folderPath, { recursive: true });

  return {
    folderName,
    folderPath,
    relativePath: path.posix.join("uploads", folderName),
  };
}

/**
 * Remove a temporary upload folder and its split PDFs.
 * @param {{ folderPath: string } | null | undefined} uploadFolder
 */
// export async function deleteUploadFolder(uploadFolder) {
//   if (!uploadFolder?.folderPath) return;

//   await rm(uploadFolder.folderPath, { recursive: true, force: true });
// }
