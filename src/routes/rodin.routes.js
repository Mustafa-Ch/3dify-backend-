import express from "express";
import multer from "multer";
import {
  checkRodinStatus,
  downloadRodinModel,
  uploadImageToRodin,
} from "../controllers/rodin.controllers.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/rodin/upload", upload.single("image"), uploadImageToRodin);
router.post("/rodin/status", checkRodinStatus);
router.post("/rodin/download", downloadRodinModel);

export default router;
