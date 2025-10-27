import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fetch from "node-fetch";
import authRoutes from "./routes/auth.routes.js";
import rodinRoutes from "./routes/rodin.routes.js";
import connectDB, { sequelize } from "./db/index.js";

const app = express();

dotenv.config();

app.use(express.json());
app.use(cors());
app.use(cookieParser());


app.use("/api/v1", authRoutes);
app.use("/api/v1", rodinRoutes);


app.get("/api/v1/proxy-glb", async (req, res) => {
  const { url } = req.query;
  console.log({url})
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch file" });
    }

    console.log({response})

    const arrayBuffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "model/gltf-binary");
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("🔥 Proxy Error:", err);
    res.status(500).json({ error: err.message });
  }
});


app.get("/", (req, res) => {
  res.send("Hello World!");
});   

// app.listen(process.env.PORT, () => {
//   console.log(`⚙️ Server running on port: ${process.env.PORT} (DB disabled)`);
// });

connectDB()
  .then(async () => {
    await sequelize.sync({ alter: true });
    app.listen(process.env.PORT, () => {
      console.log(`⚙️ Server running on port: ${process.env.PORT}`);
    });
  })    
  .catch((err) => {
    console.log("❌ DB connection failed:", err);
  });
