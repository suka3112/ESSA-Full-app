import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class EssaSlaInstance extends Model {
  Id: number;
  ObjectType: string;
  ObjectId: string;
  Reference: string | null;
  InvoiceNumber: string | null;
  VendorName: string | null;
  CategoryId: string | null;
  CategoryName: string | null;
  PolicyId: number;
  PolicyCode: string;
  PolicyName: string;
  PolicyVersion: number | null;
  Stage: string;
  Owner: string;
  StartedAt: Date;
  DueAt: Date | null;
  WarningAt: Date | null;
  Status: string;
  FrozenRemainingMs: number | null;
  Note: string | null;
  PauseStartedAt: Date | null;
  PauseUsedMs: number;
  EventsJson: string;
  RemindersSentJson: string;
  EscalatedAt: Date | null;
  CalendarId: number | null;
  InvoiceId: number | null;
  IsDeleted: boolean;
  CreatedDt: Date;
  ModifiedDt: Date | null;
}

EssaSlaInstance.init(
  {
    Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ObjectType: { type: DataTypes.STRING(40), allowNull: false },
    ObjectId: { type: DataTypes.STRING(80), allowNull: false },
    Reference: { type: DataTypes.STRING(80), allowNull: true },
    InvoiceNumber: { type: DataTypes.STRING(80), allowNull: true },
    VendorName: { type: DataTypes.STRING(250), allowNull: true },
    CategoryId: { type: DataTypes.STRING(40), allowNull: true },
    CategoryName: { type: DataTypes.STRING(80), allowNull: true },
    PolicyId: { type: DataTypes.INTEGER, allowNull: false },
    PolicyCode: { type: DataTypes.STRING(80), allowNull: false },
    PolicyName: { type: DataTypes.STRING(200), allowNull: false },
    PolicyVersion: { type: DataTypes.INTEGER, allowNull: true },
    Stage: { type: DataTypes.STRING(40), allowNull: false },
    Owner: { type: DataTypes.STRING(80), allowNull: false },
    StartedAt: { type: DataTypes.DATE, allowNull: false },
    DueAt: { type: DataTypes.DATE, allowNull: true },
    WarningAt: { type: DataTypes.DATE, allowNull: true },
    Status: { type: DataTypes.STRING(20), allowNull: false },
    FrozenRemainingMs: { type: DataTypes.BIGINT, allowNull: true },
    Note: { type: DataTypes.STRING(500), allowNull: true },
    PauseStartedAt: { type: DataTypes.DATE, allowNull: true },
    PauseUsedMs: { type: DataTypes.BIGINT, defaultValue: 0 },
    EventsJson: { type: DataTypes.TEXT, allowNull: false, defaultValue: "[]" },
    RemindersSentJson: { type: DataTypes.TEXT, allowNull: false, defaultValue: "[]" },
    EscalatedAt: { type: DataTypes.DATE, allowNull: true },
    CalendarId: { type: DataTypes.INTEGER, allowNull: true },
    InvoiceId: { type: DataTypes.INTEGER, allowNull: true },
    IsDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    CreatedDt: { type: DataTypes.DATE, defaultValue: Sequelize.literal("NOW()") },
    ModifiedDt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: "ESSA_SLA_INSTANCE", timestamps: false },
);
