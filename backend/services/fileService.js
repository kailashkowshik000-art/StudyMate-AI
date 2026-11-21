import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const uploadDir = path.resolve(__dirname, "../uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration with filename sanitization
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to alphanumeric, dots and hyphens only (prevent path traversal)
    const baseName = path.basename(file.originalname);
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    cb(null, `${uniqueSuffix}_${sanitizedName}`);
  },
});

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".pptx", ".txt"]);
const LEGACY_EXTENSIONS = new Set([".doc", ".ppt"]);

// File Filter: strictly enforce allowed extensions and reject legacy/unsupported files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (LEGACY_EXTENSIONS.has(ext) || file.mimetype === "application/msword" || file.mimetype === "application/vnd.ms-powerpoint") {
    return cb(
      new Error(
        "Legacy binary formats (.doc, .ppt) are not supported. Please convert them to modern .docx or .pptx before uploading."
      ),
      false
    );
  }

  if (ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      `Unsupported file type: ${ext || "unknown"}. Supported formats: .pdf, .docx, .pptx, .txt`
    ),
    false
  );
};

export const maxFileSize =
  parseInt(process.env.MAX_FILE_SIZE, 10) || 26214400; // 25MB

export const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
  },
  fileFilter,
});

/**
 * Validates PDF magic bytes (%PDF-) from the first 5 bytes of the file
 */
export async function validatePdfMagicBytes(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found on disk for validation");
  }

  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(5);
    const { bytesRead } = await handle.read(buffer, 0, 5, 0);

    if (bytesRead < 5) {
      throw new Error("Invalid file: File too small to be a valid PDF document");
    }

    const header = buffer.toString("ascii");
    if (!header.startsWith("%PDF-")) {
      throw new Error(
        "Security validation failed: File does not contain valid PDF magic bytes (%PDF-)"
      );
    }

    return true;
  } finally {
    await handle.close();
  }
}

/**
 * Validates DOCX OpenXML Zip structure and required document.xml
 */
export async function validateDocxPackage(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found on disk for validation");
  }

  // Check magic bytes PK\x03\x04
  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(4);
    const { bytesRead } = await handle.read(buffer, 0, 4, 0);
    if (bytesRead < 4) {
      throw new Error("Invalid file: File too small to be a valid DOCX document");
    }
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      throw new Error("Security validation failed: File does not have a valid ZIP/OpenXML signature");
    }
  } finally {
    await handle.close();
  }

  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const hasDocumentXml = entries.some(
      (e) => e.entryName.toLowerCase() === "word/document.xml"
    );
    if (!hasDocumentXml) {
      throw new Error("Security validation failed: Missing Word document structure (word/document.xml)");
    }
    return true;
  } catch (err) {
    if (err.message.includes("Security validation failed")) throw err;
    throw new Error(`Corrupted DOCX document: ${err.message}`);
  }
}

/**
 * Validates PPTX OpenXML Zip structure and required presentation.xml
 */
export async function validatePptxPackage(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found on disk for validation");
  }

  // Check magic bytes PK\x03\x04
  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(4);
    const { bytesRead } = await handle.read(buffer, 0, 4, 0);
    if (bytesRead < 4) {
      throw new Error("Invalid file: File too small to be a valid PPTX presentation");
    }
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      throw new Error("Security validation failed: File does not have a valid ZIP/OpenXML signature");
    }
  } finally {
    await handle.close();
  }

  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const hasPresentationXml = entries.some(
      (e) => e.entryName.toLowerCase() === "ppt/presentation.xml"
    );
    if (!hasPresentationXml) {
      throw new Error("Security validation failed: Missing PowerPoint presentation structure (ppt/presentation.xml)");
    }
    return true;
  } catch (err) {
    if (err.message.includes("Security validation failed")) throw err;
    throw new Error(`Corrupted PPTX presentation: ${err.message}`);
  }
}

/**
 * Validates Plain Text file: verifies UTF-8 text and lack of null bytes
 */
export async function validateTxtFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found on disk for validation");
  }

  const stat = await fs.promises.stat(filePath);
  if (stat.size === 0) {
    throw new Error("Invalid text file: File is empty (0 bytes)");
  }

  // Inspect sample buffer up to 8KB for binary null bytes
  const handle = await fs.promises.open(filePath, "r");
  try {
    const sampleSize = Math.min(stat.size, 8192);
    const buffer = Buffer.alloc(sampleSize);
    await handle.read(buffer, 0, sampleSize, 0);

    for (let i = 0; i < sampleSize; i++) {
      if (buffer[i] === 0x00) {
        throw new Error("Security validation failed: Plain text file contains binary null bytes");
      }
    }
    return true;
  } finally {
    await handle.close();
  }
}

/**
 * Validates all required criteria for any supported format (.pdf, .docx, .pptx, .txt):
 * MIME, extension, size, and package/magic byte integrity.
 * Deletes invalid file from disk immediately if validation fails.
 */
export async function validateUploadedFile({
  filePath,
  originalname,
  mimetype,
  size,
}) {
  const ext = path.extname(originalname || "").toLowerCase();

  if (LEGACY_EXTENSIONS.has(ext)) {
    removeFileFromDisk(filePath);
    throw new Error("Legacy binary formats (.doc, .ppt) are not supported. Please convert them to modern .docx or .pptx before uploading.");
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    removeFileFromDisk(filePath);
    throw new Error(`Unsupported file type: ${ext || "unknown"}. Supported formats: .pdf, .docx, .pptx, .txt`);
  }

  if (size > maxFileSize) {
    removeFileFromDisk(filePath);
    throw new Error(
      `File size exceeds maximum allowed limit of ${(
        maxFileSize /
        (1024 * 1024)
      ).toFixed(0)}MB`
    );
  }

  try {
    switch (ext) {
      case ".pdf":
        await validatePdfMagicBytes(filePath);
        break;
      case ".docx":
        await validateDocxPackage(filePath);
        break;
      case ".pptx":
        await validatePptxPackage(filePath);
        break;
      case ".txt":
        await validateTxtFile(filePath);
        break;
      default:
        throw new Error(`Unsupported format: ${ext}`);
    }
  } catch (err) {
    removeFileFromDisk(filePath);
    throw err;
  }

  return true;
}

/**
 * Validates strictly PDF files (backward compatibility for legacy PDF-only endpoints and security tests)
 */
export async function validateUploadedPdf({
  filePath,
  originalname,
  mimetype,
  size,
}) {
  const ext = path.extname(originalname || "").toLowerCase();
  if (ext !== ".pdf") {
    removeFileFromDisk(filePath);
    throw new Error("Invalid file extension: Only .pdf files are permitted");
  }

  if (mimetype !== "application/pdf") {
    removeFileFromDisk(filePath);
    throw new Error("Invalid MIME type: Only application/pdf is permitted");
  }

  if (size > maxFileSize) {
    removeFileFromDisk(filePath);
    throw new Error(
      `File size exceeds maximum allowed limit of ${(
        maxFileSize /
        (1024 * 1024)
      ).toFixed(0)}MB`
    );
  }

  try {
    await validatePdfMagicBytes(filePath);
  } catch (err) {
    removeFileFromDisk(filePath);
    throw err;
  }

  return true;
}

/**
 * Resolve a sanitized, safe path inside the uploads directory (prevents directory traversal)
 */
export function getSafeUploadPath(fileName) {
  const base = path.basename(fileName);
  const resolved = path.resolve(uploadDir, base);

  if (!resolved.startsWith(uploadDir)) {
    throw new Error("Directory traversal attempt detected");
  }

  return resolved;
}

export const removeFileFromDisk = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    console.error(`[FileService] Failed to remove file ${filePath}:`, err.message);
  }
  return false;
};

export default {
  upload,
  uploadDir,
  maxFileSize,
  validatePdfMagicBytes,
  validateDocxPackage,
  validatePptxPackage,
  validateTxtFile,
  validateUploadedFile,
  validateUploadedPdf,
  getSafeUploadPath,
  removeFileFromDisk,
};