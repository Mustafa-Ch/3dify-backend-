import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import RodinTask from "../models/rodin.models.js";

export const uploadImageToRodin = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Image file is required" });

    const formData = new FormData();
    formData.append("images", fs.createReadStream(req.file.path));

    const rodinResponse = await axios.post(
      "https://api.hyper3d.com/api/v2/rodin",
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.RODIN_API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    fs.unlinkSync(req.file.path);

    const { uuid } = rodinResponse.data;

    // Sequelize create
    const newTask = await RodinTask.create({
      imageUrl: req.file.originalname,
      task_uuid: uuid,
    });

    return res.status(200).json({
      message: "Upload successful",
      task: newTask,
    });
  } catch (error) {
    console.error(
      "Rodin Upload Error:",
      error?.response?.data || error.message
    );
    res.status(500).json({
      error: "rodin_upload_failed",
      details: error?.response?.data || error.message,
    });
  }
};

/**
 * ✅ Check Rodin task status and update DB
 */
export const checkRodinStatus = async (req, res) => {
  try {
    const { uuid } = req.query;
    if (!uuid) return res.status(400).json({ error: "uuid required" });

    const statusResp = await axios.post(
      `https://api.hyper3d.com/api/v2/status?uuid=${uuid}`,
      {},
      {
        headers: { Authorization: `Bearer ${process.env.RODIN_API_KEY}` },
      }
    );

    // Sequelize update
    const task = await RodinTask.findOne({ where: { task_uuid: uuid } });
    if (task) {
      task.status = statusResp.data.status;
      await task.save();
    }

    res.status(200).json(statusResp.data);
  } catch (error) {
    console.error(
      "Rodin Status Error:",
      error?.response?.data || error.message
    );
    res.status(500).json({
      error: "rodin_status_failed",
      details: error?.response?.data || error.message,
    });
  }
};

/**
 * ✅ Download model and store URLs in DB
 */
export const downloadRodinModel = async (req, res) => {
  try {
    const { task_uuid } = req.body;
    if (!task_uuid)
      return res.status(400).json({ error: "task_uuid required" });

    const dlResp = await axios.post(
      "https://api.hyper3d.com/api/v2/download",
      { task_uuid },
      {
        headers: { Authorization: `Bearer ${process.env.RODIN_API_KEY}` },
      }
    );

    const task = await RodinTask.findOne({ where: { task_uuid } });
    if (task) {
      task.result = dlResp.data;
      task.status = "completed";
      await task.save();
    }

    res.status(200).json({
      message: "3D model ready",
      task,
    });
  } catch (error) {
    console.error(
      "Rodin Download Error:",
      error?.response?.data || error.message
    );
    res.status(500).json({
      error: "rodin_download_failed",
      details: error?.response?.data || error.message,
    });
  }
};
