import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";

const RodinTask = sequelize.define(
  "RodinTask",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: {
          args: /^[a-zA-Z0-9\-]+\.(jpg|jpeg|png)$/i,
          msg: "imageUrl must be a valid image file name (e.g., image.jpg, image.png)",
        },
      },
    },
    task_uuid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "pending",
    },
    result: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    originalname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    job_uuids: {
      type: DataTypes.JSONB, // Store array of job UUIDs
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    timestamps: true,
    tableName: "rodin_tasks",
    indexes: [
      {
        unique: true,
        fields: ["task_uuid"],
      },
    ],
  }
);

export default RodinTask;
