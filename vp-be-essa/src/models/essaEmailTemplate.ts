import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { User } from "./user";

export class EssaEmailTemplate extends Model {
  Id: number;
  Name: string;
  ScenarioKey: string;
  Description: string | null;
  Subject: string;
  BodyHtml: string;
  RecipientTo: string;
  RecipientCc: string | null;
  RecipientBcc: string | null;
  RequiredPlaceholders: string;
  Status: string;
  IsSystem: boolean;
  Version: number;
  IsDeleted: boolean;
  CreatedDt: Date;
  CreatedBy: number | null;
  ModifiedDt: Date | null;
  ModifiedBy: number | null;
}

EssaEmailTemplate.init(
  {
    Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    Name: { type: DataTypes.STRING(200), allowNull: false },
    ScenarioKey: { type: DataTypes.STRING(80), allowNull: false },
    Description: { type: DataTypes.STRING(500), allowNull: true },
    Subject: { type: DataTypes.STRING(500), allowNull: false },
    BodyHtml: { type: DataTypes.TEXT, allowNull: false },
    RecipientTo: { type: DataTypes.STRING(500), allowNull: false },
    RecipientCc: { type: DataTypes.STRING(500), allowNull: true },
    RecipientBcc: { type: DataTypes.STRING(500), allowNull: true },
    RequiredPlaceholders: { type: DataTypes.STRING(500), allowNull: false },
    Status: { type: DataTypes.STRING(20), allowNull: false },
    IsSystem: { type: DataTypes.BOOLEAN, defaultValue: false },
    Version: { type: DataTypes.INTEGER, defaultValue: 1 },
    IsDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    CreatedDt: { type: DataTypes.DATE, defaultValue: Sequelize.literal("NOW()") },
    CreatedBy: { type: DataTypes.INTEGER, allowNull: true },
    ModifiedDt: { type: DataTypes.DATE, allowNull: true },
    ModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: "ESSA_EMAIL_TEMPLATE", timestamps: false },
);

EssaEmailTemplate.belongsTo(User, {
  foreignKey: "ModifiedBy",
  targetKey: "ID",
  as: "modifier",
});
