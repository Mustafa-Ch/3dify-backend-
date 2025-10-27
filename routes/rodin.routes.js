import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  checkRodinStatus,
  downloadRodinModel,
  uploadImageToRodin,
} from "../controllers/rodin.controllers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG and JPEG files are allowed"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = express.Router();

router.post("/rodin/upload", upload.array("images", 10), uploadImageToRodin);
router.get("/rodin/status", checkRodinStatus);
router.post("/rodin/download", downloadRodinModel);

export default router;
