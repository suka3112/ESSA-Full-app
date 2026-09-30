import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApExtractionTypeDocument extends Model {
  TypeDocumentId: number;
  InvoiceTypeId: number;
  DocumentId: number;
  IsEnabled: boolean;
  IsMandatory: boolean;
  OcrCategoryId: string | null;
  SplitBehavior: string | null;
  ClassificationHints: string | null;
  DisplayOrder: number;
  IsDeleted: boolean;
  CreatedAt: Date;
  CreatedBy: number | null;
  UpdatedAt: Date | null;
  UpdatedBy: number | null;
}

ApExtractionTypeDocument.init(
  {
    TypeDocumentId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    InvoiceTypeId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    DocumentId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    IsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    IsMandatory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    OcrCategoryId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    SplitBehavior: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    ClassificationHints: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    DisplayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: "AP_EXTRACTION_TYPE_DOCUMENT",
    timestamps: false,
  },
);
