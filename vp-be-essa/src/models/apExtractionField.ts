import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApExtractionField extends Model {
  FieldId: number;
  TypeDocumentId: number;
  FieldName: string;
  DisplayName: string | null;
  Hint: string | null;
  DisplayOrder: number;
  IsDeleted: boolean;
  CreatedAt: Date;
  CreatedBy: number | null;
  UpdatedAt: Date | null;
  UpdatedBy: number | null;
}

ApExtractionField.init(
  {
    FieldId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    TypeDocumentId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    FieldName: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    DisplayName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    Hint: {
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
    tableName: "AP_EXTRACTION_FIELD",
    timestamps: false,
  },
);
