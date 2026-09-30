import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApValidationResult extends Model {
  ValidationId: number;
  InvoiceHeaderId: number | null;
  DocumentId: number | null;
  ConfigVersionId: number | null;
  MappingId: number | null;
  DocumentRuleId: number | null;
  ValidationRunId: number | null;
  RuleCode: string;
  RuleName: string;
  Severity: string;
  ExpectedValue: string | null;
  ActualValue: string | null;
  VarianceValue: number | null;
  Message: string | null;
  SourceTable: string | null;
  SourceRecordId: string | null;
  CreatedBy: number | null;
}

ApValidationResult.init(
  {
    ValidationId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    InvoiceHeaderId: { type: DataTypes.INTEGER },
    DocumentId: { type: DataTypes.BIGINT },
    ConfigVersionId: { type: DataTypes.BIGINT, allowNull: true },
    MappingId: { type: DataTypes.BIGINT, allowNull: true },
    DocumentRuleId: { type: DataTypes.BIGINT, allowNull: true },
    ValidationRunId: { type: DataTypes.BIGINT, allowNull: true },
    RuleCode: { type: DataTypes.STRING(100) },
    RuleName: { type: DataTypes.STRING(200) },
    Severity: { type: DataTypes.STRING(20) },
    ExpectedValue: { type: DataTypes.TEXT },
    ActualValue: { type: DataTypes.TEXT },
    VarianceValue: { type: DataTypes.DECIMAL(18, 3) },
    Message: { type: DataTypes.STRING(1000) },
    SourceTable: { type: DataTypes.STRING(100) },
    SourceRecordId: { type: DataTypes.STRING(100) },
    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("NOW()"),
    },
    CreatedBy: { type: DataTypes.INTEGER },
  },
  {
    sequelize,
    tableName: "AP_VALIDATION_RESULT",
    timestamps: false,
  },
);
