import fsSync from "fs";
import fs from "fs/promises";
import axios from "axios";
import FormData from "form-data";
import RodinTask from "../models/rodin.models.js";

export const uploadImageToRodin = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one image file is required" });
    }

    const uploadPromises = req.files.map(async (file) => {
      console.log(
        `Processing file: ${file.path}, filename: ${file.filename}, originalname: ${file.originalname}`
      );
      try {
        await fs.access(file.path);
        console.log(`File exists: ${file.path}`);
      } catch {
        throw new Error(`File not found at ${file.path}`);
      }

      const formData = new FormData();
      formData.append("images", fsSync.createReadStream(file.path));

      try {
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
        console.log("Rodin API response:", rodinResponse.data);

        try {
          await fs.unlink(file.path);
          console.log(`File deleted: ${file.path}`);
        } catch (unlinkError) {
          console.warn(
            `Failed to delete file ${file.path}: ${unlinkError.message}`
          );
        }

        const { uuid, jobs } = rodinResponse.data;
        const newTask = await RodinTask.create({
          imageUrl: file.filename,
          task_uuid: uuid,
          originalname: file.originalname,
          job_uuids: jobs?.uuids || [],
          result: { jobs }, // Store subscription_key and job_uuids
        });

        return {
          message: "Upload successful",
          task: {
            imageUrl: file.filename,
            originalname: file.originalname,
            task_uuid: uuid,
            job_uuids: jobs?.uuids || [],
          },
        };
      } catch (error) {
        try {
          await fs.unlink(file.path);
          console.log(`File deleted: ${file.path}`);
        } catch (unlinkError) {
          console.warn(
            `Failed to delete file ${file.path}: ${unlinkError.message}`
          );
        }
        throw new Error(`Upload failed for ${file.filename}: ${error.message}`);
      }
    });

    const results = await Promise.allSettled(uploadPromises);
    const successful = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    const failed = results
      .filter((r) => r.status === "rejected")
      .map((r) => ({
        error: "Upload failed",
        details: r.reason.message,
      }));

    res.status(200).json({ successful, failed });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "rodin_upload_failed",
      details: error?.response?.data || error.message,
    });
  }
};
export const checkRodinStatus = async (req, res) => {
  try {
    const { uuid } = req.query;
    if (!uuid) return res.status(400).json({ error: "uuid required" });

    const task = await RodinTask.findOne({ where: { task_uuid: uuid } });
    if (!task)
      return res.status(404).json({ error: "Task not found in database" });

    console.log("Checking status for:", {
      uuid,
      subscription_key: task.result?.jobs?.subscription_key,
      job_uuids: task.job_uuids,
    });

    await new Promise((resolve) => setTimeout(resolve, 10000));

    let statusResp = await axios.post(
      "https://api.hyper3d.com/api/v2/status",
      { subscription_key: task.result?.jobs?.subscription_key || "" },
      { headers: { Authorization: `Bearer ${process.env.RODIN_API_KEY}` } }
    );

    let retryCount = 0;
    const maxRetries = 3;
    if (
      statusResp.data.error &&
      statusResp.data.error !== "OK" &&
      task.result?.jobs?.subscription_key
    ) {
      while (retryCount < maxRetries) {
        retryCount++;
        try {
          statusResp = await axios.post(
            "https://api.hyper3d.com/api/v2/status",
            { subscription_key: task.result?.jobs?.subscription_key },
            {
              headers: {
                Authorization: `Bearer ${process.env.RODIN_API_KEY}`,
              },
            }
          );
          if (statusResp.data.error === "OK") break;
        } catch (jobError) {
          console.warn(
            `Retry ${retryCount}/${maxRetries} failed for subscription_key ${task.result?.jobs?.subscription_key}:`,
            jobError.message
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (
      statusResp.data.error &&
      statusResp.data.error !== "OK" &&
      retryCount >= maxRetries
    ) {
      task.status = "failed";
      await task.save();
      console.error(
        `Status check failed after ${maxRetries} retries for UUID ${uuid}`
      );
      return res.status(404).json({ error: "Task not found after retries" });
    }

    console.log(
      "Rodin status response:",
      JSON.stringify(statusResp.data, null, 2)
    );

    const allJobsDone = statusResp.data.jobs?.every(
      (job) => job.status === "Done" || job.status === "Failed"
    );
    task.status = allJobsDone
      ? statusResp.data.jobs.some((job) => job.status === "Done")
        ? "completed"
        : "failed"
      : "pending";
    await task.save();

    res.status(200).json(statusResp.data);
  } catch (error) {
    console.error(`Status check error for UUID ${uuid}:`, error);
    res.status(500).json({
      error: "rodin_status_failed",
      details: error?.response?.data || error.message,
    });
  }
};

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

      console.log(
        "Rodin download response:",
        JSON.stringify(dlResp.data, null, 2)
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
