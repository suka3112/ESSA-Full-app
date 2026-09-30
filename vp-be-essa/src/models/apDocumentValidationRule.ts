import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApDocumentValidationRule extends Model {
  RuleId: number;
  ConfigVersionId: number;
  DocumentId: number | null;
  DocumentTitle: string;
  RuleCode: string | null;
  RuleName: string;
  CheckScope: string;
  IsMandatory: boolean;
  MissingAction: string;
  ContentValidation: boolean;
  WorkflowImpact: string | null;
  WorkflowImpactDetail: string | null;
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

ApDocumentValidationRule.init(
  {
    RuleId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    ConfigVersionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    DocumentId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    DocumentTitle: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    RuleCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    RuleName: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    CheckScope: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    IsMandatory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    MissingAction: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    ContentValidation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    WorkflowImpact: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    WorkflowImpactDetail: {
      type: DataTypes.STRING(500),
      allowNull: true,
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
    tableName: "AP_DOCUMENT_VALIDATION_RULE",
    timestamps: false,
  },
);
