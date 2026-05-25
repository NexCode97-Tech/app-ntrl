import multer from "multer";
import path from "path";
import { readFileSync } from "fs";
import sharp from "sharp";
import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";

/**
 * Detecta el tipo MIME real de un archivo por sus bytes de cabecera.
 * Soporta: JPEG, PNG, PDF, WebP, HEIC, HEIF, AVIF, GIF, BMP.
 *
 * Para ISOBMFF (HEIC/HEIF/AVIF): verifica la caja "ftyp" en bytes 4-7
 * y el major brand en bytes 8-11, en lugar de confiar en el tamaño
 * del box (primeros 4 bytes), que varía entre encoders.
 */
function detectMimeType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  const b0 = buffer.slice(0, 4).toString("hex");

  // JPEG: FF D8 FF
  if (b0.startsWith("ffd8ff")) return "image/jpeg";

  // PNG: 89 50 4E 47
  if (b0 === "89504e47") return "image/png";

  // PDF: %PDF
  if (b0 === "25504446") return "application/pdf";

  // GIF: GIF8
  if (b0 === "47494638") return "image/gif";

  // BMP: BM
  if (buffer.slice(0, 2).toString("hex") === "424d") return "image/bmp";

  // WebP: RIFF....WEBP
  if (b0 === "52494646") {
    const webpTag = buffer.slice(8, 12).toString("ascii");
    if (webpTag === "WEBP") return "image/webp";
    return null; // RIFF pero no WebP (ej: WAV, AVI)
  }

  // ISOBMFF (HEIC, HEIF, AVIF): bytes 4-7 deben ser "ftyp"
  const ftyp = buffer.slice(4, 8).toString("ascii");
  if (ftyp === "ftyp") {
    const brand = buffer.slice(8, 12).toString("ascii").toLowerCase().trim();
    // AVIF brands
    if (brand === "avif" || brand === "avis" || brand === "av01") return "image/avif";
    // HEIC brands
    if (brand === "heic" || brand === "heix") return "image/heic";
    // HEIF / generic brands (mif1, msf1, etc.)
    if (brand === "heif" || brand === "mif1" || brand === "msf1") return "image/heif";
    // MIF1 puede ser HEIF o AVIF — permitir como heif genérico
    return "image/heif";
  }

  return null;
}

const storage = multer.memoryStorage();

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf", ".webp", ".heic", ".heif", ".avif", ".gif", ".bmp"];
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
    if (!realMime) {
      const hexDump = file.buffer?.slice(0, 12).toString("hex") ?? "N/A";
      console.warn(`[sanitizeUploadLight] Archivo rechazado — name: "${file.originalname}", claimed mime: "${file.mimetype}", hex[0-12]: ${hexDump}`);
      return next(new AppError("Tipo de archivo no reconocido.", 400, "FILE_MISMATCH"));
    }
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
