import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class EssaSlaCalendar extends Model {
  Id: number;
  Code: string;
  Name: string;
  Timezone: string;
  WorkingDays: string;
  WorkStart: string;
  WorkEnd: string;
  Status: string;
  Version: number;
  EffectiveFrom: string | null;
  ExceptionsJson: string;
  IsDeleted: boolean;
  ChangedBy: string | null;
  ChangedAt: Date | null;
  CreatedDt: Date;
  CreatedBy: number | null;
  ModifiedDt: Date | null;
  ModifiedBy: number | null;
}

EssaSlaCalendar.init(
  {
    Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    Code: { type: DataTypes.STRING(80), allowNull: false },
    Name: { type: DataTypes.STRING(200), allowNull: false },
    Timezone: { type: DataTypes.STRING(80), allowNull: false },
    WorkingDays: { type: DataTypes.STRING(50), allowNull: false },
    WorkStart: { type: DataTypes.STRING(5), allowNull: false },
    WorkEnd: { type: DataTypes.STRING(5), allowNull: false },
    Status: { type: DataTypes.STRING(20), allowNull: false },
    Version: { type: DataTypes.INTEGER, defaultValue: 1 },
    EffectiveFrom: { type: DataTypes.DATEONLY, allowNull: true },
    ExceptionsJson: { type: DataTypes.TEXT, allowNull: false, defaultValue: "[]" },
    IsDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    ChangedBy: { type: DataTypes.STRING(200), allowNull: true },
    ChangedAt: { type: DataTypes.DATE, allowNull: true },
    CreatedDt: { type: DataTypes.DATE, defaultValue: Sequelize.literal("NOW()") },
    CreatedBy: { type: DataTypes.INTEGER, allowNull: true },
    ModifiedDt: { type: DataTypes.DATE, allowNull: true },
    ModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: "ESSA_SLA_CALENDAR", timestamps: false },
);
