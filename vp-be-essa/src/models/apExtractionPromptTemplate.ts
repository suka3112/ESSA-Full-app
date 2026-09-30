import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApExtractionPromptTemplate extends Model {
  PromptTemplateId: number;
  InvoiceTypeId: number;
  PromptText: string | null;
  IsManuallyEdited: boolean;
  IsDeleted: boolean;
  CreatedAt: Date;
  CreatedBy: number | null;
  UpdatedAt: Date | null;
  UpdatedBy: number | null;
}

ApExtractionPromptTemplate.init(
  {
    PromptTemplateId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    InvoiceTypeId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
    },
    PromptText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    IsManuallyEdited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: "AP_EXTRACTION_PROMPT_TEMPLATE",
    timestamps: false,
  },
);
