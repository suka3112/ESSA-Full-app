import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class EssaSlaPolicy extends Model {
  Id: number;
  Code: string;
  Name: string;
  Description: string | null;
  ScopeType: string;
  Activity: string | null;
  Stage: string;
  TriggerEvent: string;
  Owner: string;
  Provisional: boolean;
  ProvisionalNote: string | null;
  Version: number;
  Status: string;
  EffectiveFrom: string | null;
  EffectiveTo: string | null;
  TimerJson: string;
  RemindersJson: string;
  EscalationJson: string;
  PauseRulesJson: string;
  ManualPauseAllowed: boolean;
  MaxPauseJson: string | null;
  PublishedBy: string | null;
  PublishedAt: Date | null;
  ChangedBy: string | null;
  ChangedAt: Date | null;
  ChangeSummary: string | null;
  RetiredAt: Date | null;
  LastTestedAt: Date | null;
  IsDeleted: boolean;
  CreatedDt: Date;
  CreatedBy: number | null;
  ModifiedDt: Date | null;
  ModifiedBy: number | null;
}

EssaSlaPolicy.init(
  {
    Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    Code: { type: DataTypes.STRING(80), allowNull: false },
    Name: { type: DataTypes.STRING(200), allowNull: false },
    Description: { type: DataTypes.STRING(500), allowNull: true },
    ScopeType: { type: DataTypes.STRING(40), allowNull: false },
    Activity: { type: DataTypes.STRING(40), allowNull: true },
    Stage: { type: DataTypes.STRING(40), allowNull: false },
    TriggerEvent: { type: DataTypes.STRING(40), allowNull: false },
    Owner: { type: DataTypes.STRING(40), allowNull: false },
    Provisional: { type: DataTypes.BOOLEAN, defaultValue: false },
    ProvisionalNote: { type: DataTypes.TEXT, allowNull: true },
    Version: { type: DataTypes.INTEGER, defaultValue: 1 },
    Status: { type: DataTypes.STRING(20), allowNull: false },
    EffectiveFrom: { type: DataTypes.DATEONLY, allowNull: true },
    EffectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    TimerJson: { type: DataTypes.TEXT, allowNull: false },
    RemindersJson: { type: DataTypes.TEXT, allowNull: false, defaultValue: "[]" },
    EscalationJson: { type: DataTypes.TEXT, allowNull: false },
    PauseRulesJson: { type: DataTypes.TEXT, allowNull: false, defaultValue: "[]" },
    ManualPauseAllowed: { type: DataTypes.BOOLEAN, defaultValue: true },
    MaxPauseJson: { type: DataTypes.TEXT, allowNull: true },
    PublishedBy: { type: DataTypes.STRING(200), allowNull: true },
    PublishedAt: { type: DataTypes.DATE, allowNull: true },
    ChangedBy: { type: DataTypes.STRING(200), allowNull: true },
    ChangedAt: { type: DataTypes.DATE, allowNull: true },
    ChangeSummary: { type: DataTypes.STRING(500), allowNull: true },
    RetiredAt: { type: DataTypes.DATE, allowNull: true },
    LastTestedAt: { type: DataTypes.DATE, allowNull: true },
    IsDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    CreatedDt: { type: DataTypes.DATE, defaultValue: Sequelize.literal("NOW()") },
    CreatedBy: { type: DataTypes.INTEGER, allowNull: true },
    ModifiedDt: { type: DataTypes.DATE, allowNull: true },
    ModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: "ESSA_SLA_POLICY", timestamps: false },
);
