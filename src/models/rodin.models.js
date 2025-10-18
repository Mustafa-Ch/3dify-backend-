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
    },
    task_uuid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "pending",
    },
    result: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "rodin_tasks",
  }
);

export default RodinTask;
