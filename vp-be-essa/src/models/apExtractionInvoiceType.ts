import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApExtractionInvoiceType extends Model {
  InvoiceTypeId: number;
  CategoryId: number;
  Code: string;
  Name: string;
  DisplayOrder: number;
  IsDeleted: boolean;
  CreatedAt: Date;
  CreatedBy: number | null;
  UpdatedAt: Date | null;
  UpdatedBy: number | null;
}

ApExtractionInvoiceType.init(
  {
    InvoiceTypeId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    CategoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
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
    tableName: "AP_EXTRACTION_INVOICE_TYPE",
    timestamps: false,
  },
);
