import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { EssaEmailScenario } from "./essaEmailScenario";

export class EssaEmailScenarioVariable extends Model {
  Id: number;
  ScenarioId: number;
  VariableName: string;
  Label: string;
  SampleValue: string | null;
  IsRequired: boolean;
}

EssaEmailScenarioVariable.init(
  {
    Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ScenarioId: { type: DataTypes.INTEGER, allowNull: false },
    VariableName: { type: DataTypes.STRING(80), allowNull: false },
    Label: { type: DataTypes.STRING(120), allowNull: false },
    SampleValue: { type: DataTypes.STRING(200), allowNull: true },
    IsRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { sequelize, tableName: "ESSA_EMAIL_SCENARIO_VARIABLE", timestamps: false },
);

EssaEmailScenario.hasMany(EssaEmailScenarioVariable, {
  foreignKey: "ScenarioId",
  as: "variables",
});
EssaEmailScenarioVariable.belongsTo(EssaEmailScenario, {
  foreignKey: "ScenarioId",
  as: "scenario",
});
