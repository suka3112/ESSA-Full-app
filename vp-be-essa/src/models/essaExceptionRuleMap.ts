import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class EssaExceptionRuleMap extends Model {
  RuleCode: string;
  MatchHint: string;
  ExceptionCode: string;
}

EssaExceptionRuleMap.init(
  {
    RuleCode: { type: DataTypes.STRING(100), primaryKey: true },
    MatchHint: { type: DataTypes.STRING(200), primaryKey: true, defaultValue: "" },
    ExceptionCode: { type: DataTypes.STRING(20), allowNull: false },
  },
  { sequelize, tableName: "ESSA_EXCEPTION_RULE_MAP", timestamps: false },
);
