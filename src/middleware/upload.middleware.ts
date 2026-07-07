import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
];

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max size
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max size
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

export const validateMagicBytes = async (req: any, res: any, next: any) => {
  if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
    return next();
  }

  try {
    const { fileTypeFromFile, fileTypeFromBuffer } = await import("file-type");
    const fs = await import("fs/promises");
    
    const files = req.files 
      ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
      : req.file ? [req.file] : [];

    for (const file of files) {
      let type;
      if (file.buffer) {
        type = await fileTypeFromBuffer(file.buffer);
      } else if (file.path) {
        type = await fileTypeFromFile(file.path);
      }
      
      if (!type || !allowedMimeTypes.includes(type.mime)) {
        if (file.path) {
          await fs.unlink(file.path).catch(() => {});
        }
        return res.status(400).json({ message: "Invalid file magic bytes detected. Spoofed content-type." });
      }
      
      file.mimetype = type.mime;
    }
    
    next();
  } catch (error) {
    console.error("Magic byte validation error:", error);
    const fs = await import("fs/promises");
    const files = req.files 
      ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
      : req.file ? [req.file] : [];
    for (const file of files) {
      if (file.path) await fs.unlink(file.path).catch(() => {});
    }
    return res.status(500).json({ message: "Failed to validate file" });
  }
};
