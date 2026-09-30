import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class EssaEmailScenario extends Model {
  Id: number;
  ScenarioKey: string;
  Label: string;
  Description: string | null;
  Category: string;
  DefaultTo: string;
  DefaultCc: string | null;
  DefaultBcc: string | null;
  IsDeleted: boolean;
  CreatedDt: Date;
  CreatedBy: number | null;
  ModifiedDt: Date | null;
  ModifiedBy: number | null;
}

EssaEmailScenario.init(
  {
    Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ScenarioKey: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    Label: { type: DataTypes.STRING(120), allowNull: false },
    Description: { type: DataTypes.STRING(500), allowNull: true },
    Category: { type: DataTypes.STRING(40), allowNull: false },
    DefaultTo: { type: DataTypes.STRING(200), allowNull: false },
    DefaultCc: { type: DataTypes.STRING(200), allowNull: true },
    DefaultBcc: { type: DataTypes.STRING(200), allowNull: true },
    IsDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    CreatedDt: { type: DataTypes.DATE, defaultValue: Sequelize.literal("NOW()") },
    CreatedBy: { type: DataTypes.INTEGER, allowNull: true },
    ModifiedDt: { type: DataTypes.DATE, allowNull: true },
    ModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: "ESSA_EMAIL_SCENARIO", timestamps: false },
);
