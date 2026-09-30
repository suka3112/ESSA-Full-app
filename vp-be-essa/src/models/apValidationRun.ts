import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApValidationRun extends Model {
  ValidationRunId: number;
  InvoiceHeaderId: number | null;
  DocumentId: number | null;
  ConfigVersionId: number | null;
  TriggerEvent: string;
  Status: string;
  StartedAt: Date;
  CompletedAt: Date | null;
  TriggeredBy: number | null;
  CreatedAt: Date;
  CreatedBy: number | null;
  UpdatedAt: Date | null;
  UpdatedBy: number | null;
}

ApValidationRun.init(
  {
    ValidationRunId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    InvoiceHeaderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    DocumentId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    ConfigVersionId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    TriggerEvent: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    Status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "COMPLETED",
    },
    StartedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("NOW()"),
    },
    CompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    TriggeredBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    tableName: "AP_VALIDATION_RUN",
    timestamps: false,
  },
);
