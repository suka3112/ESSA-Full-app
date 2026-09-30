import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApSapFieldMapping extends Model {
  MappingId: number;
  ConfigVersionId: number;
  FieldId: number | null;
  CapturedFieldCode: string;
  CapturedFieldDescription: string | null;
  SapTable: string | null;
  SapFieldName: string;
  SapFieldDescription: string | null;
  ValidationType: string;
  ToleranceType: string;
  ToleranceValue: number | null;
  ToleranceMin: number | null;
  ToleranceMax: number | null;
  IsMandatory: boolean;
  Status: string;
  DisplayOrder: number;
  Scope: string;
  Severity: string;
  OverrideAllowed: boolean;
  OverrideRole: string | null;
  HandlerKey: string | null;
  OutcomeCode: string | null;
  RuleEffectiveFrom: string | Date | null;
  RuleEffectiveTo: string | Date | null;
  IsDeleted: boolean;
  CreatedAt: Date;
  CreatedBy: number | null;
  UpdatedAt: Date | null;
  UpdatedBy: number | null;
}

ApSapFieldMapping.init(
  {
    MappingId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    ConfigVersionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    FieldId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    CapturedFieldCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    CapturedFieldDescription: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    SapTable: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    SapFieldName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    SapFieldDescription: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    ValidationType: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    ToleranceType: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    ToleranceValue: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: true,
    },
    ToleranceMin: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: true,
    },
    ToleranceMax: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: true,
    },
    IsMandatory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    Status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Active",
    },
    DisplayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    Scope: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "DOCUMENT",
    },
    Severity: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ERROR",
    },
    OverrideAllowed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    OverrideRole: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    HandlerKey: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    OutcomeCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    RuleEffectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    RuleEffectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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
    tableName: "AP_SAP_FIELD_MAPPING",
    timestamps: false,
  },
);
