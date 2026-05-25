import multer from "multer";
import path from "path";
import { readFileSync } from "fs";
import sharp from "sharp";
import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";

// Magic bytes para validar tipo real de archivo
// Soporta JPEG, PNG, PDF, WebP, HEIC/HEIF, AVIF, GIF, BMP
const MAGIC_BYTES = {
  "ffd8ff":           "image/jpeg",          // JPEG
  "89504e47":         "image/png",           // PNG
  "25504446":         "application/pdf",     // PDF
  "52494646":         "image/webp",          // WebP (RIFF....WEBP)
  "00000018":         "image/heic",          // HEIC/HEIF
  "0000001c":         "image/heic",          // HEIC variante
  "00000020":         "image/heic",          // HEIF
  "47494638":         "image/gif",           // GIF
  "424d":             "image/bmp",           // BMP
};

// Para WebP necesitamos verificar también los bytes 8-11 ("WEBP")
function detectMimeType(buffer) {
  const hex = buffer.slice(0, 4).toString("hex");

  // WebP: empieza con RIFF y en posición 8 dice WEBP
  if (hex.startsWith("52494646")) {
    const webpTag = buffer.slice(8, 12).toString("ascii");
    if (webpTag === "WEBP") return "image/webp";
    return null; // RIFF pero no WebP
  }

  for (const [magic, mime] of Object.entries(MAGIC_BYTES)) {
    if (hex.startsWith(magic)) return mime;
  }
  return null;
}

const storage = multer.memoryStorage();

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf", ".webp", ".heic", ".heif", ".gif", ".bmp"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

function makeUpload(allowedExts, errMsg) {
  return multer({
    storage,
    limits: { fileSize: config.upload.maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext    = path.extname(file.originalname).toLowerCase();
      const mimeOk = config.upload.allowedMimeTypes.includes(file.mimetype);
      const extOk  = allowedExts.includes(ext);
      if (mimeOk || extOk) cb(null, true);
      else cb(new AppError(errMsg, 400, "INVALID_FILE_TYPE"));
    },
  });
}

export const upload      = makeUpload(ALLOWED_EXTENSIONS,       "Solo JPG, PNG, PDF, WebP o HEIC.");
export const uploadImage = makeUpload(ALLOWED_IMAGE_EXTENSIONS, "Solo JPG o PNG.");

// Middleware LIGERO: solo valida magic bytes, sin Sharp (para diseños de pedidos)
export function sanitizeUploadLight(req, res, next) {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  if (!files.length) return next();
  for (const file of files) {
    const realMime = detectMimeType(file.buffer);
    if (!realMime) return next(new AppError("Tipo de archivo no reconocido.", 400, "FILE_MISMATCH"));
    file.mimetype = realMime;
  }
  next();
}

// Middleware COMPLETO: valida magic bytes + recomprime con Sharp (para fotos de perfil/comprobantes)
export async function sanitizeUpload(req, res, next) {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  if (!files.length) return next();

  try {
    // Validar todos los archivos primero (rápido)
    for (const file of files) {
      const realMime = detectMimeType(file.buffer);
      if (!realMime) return next(new AppError("Tipo de archivo no reconocido.", 400, "FILE_MISMATCH"));
      file.mimetype = realMime;
    }

    // Procesar imágenes en paralelo con Sharp
    await Promise.all(files.map(async (file) => {
      if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
        const ext = file.mimetype === "image/jpeg" ? "jpeg" : "png";
        file.buffer = await sharp(file.buffer)
          .rotate()
          .toFormat(ext, { quality: 80 })
          .toBuffer();
      }
    }));

    next();
  } catch (err) {
    if (err.isOperational) return next(err);
    next(new AppError("No se pudo procesar la imagen.", 400, "IMAGE_PROCESSING_ERROR"));
  }
}
