// models/industryKey.js
import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class IndustryKey extends Model {
  id: number;
  industry_key: string; // Descriptive label (e.g., "G-F&A-Acc services")
  key: string; // Short code (e.g., "M001")
}

IndustryKey.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    industry_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    key: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "industry_keys",
    sequelize,
  },
);
