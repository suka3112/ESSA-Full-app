import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApExtractionCategory extends Model {
  CategoryId: number;
  Code: string;
  Name: string;
  IsDeleted: boolean;
  CreatedAt: Date;
  CreatedBy: number | null;
  UpdatedAt: Date | null;
  UpdatedBy: number | null;
}

ApExtractionCategory.init(
  {
    CategoryId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    Code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    Name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    UpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    UpdatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "AP_EXTRACTION_CATEGORY",
    timestamps: false,
  },
);
