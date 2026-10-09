import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class EssaExceptionCode extends Model {
  Code: string;
  ExceptionType: string;
  Name: string;
  Meaning: string;
  DocumentName: string | null;
  Status: string;
  SortOrder: number;
}

EssaExceptionCode.init(
  {
    Code: { type: DataTypes.STRING(20), primaryKey: true },
    ExceptionType: { type: DataTypes.STRING(80), allowNull: false },
    Name: { type: DataTypes.STRING(200), allowNull: false },
    Meaning: { type: DataTypes.TEXT, allowNull: false },
    DocumentName: { type: DataTypes.STRING(200), allowNull: true },
    Status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "ACTIVE" },
    SortOrder: { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize, tableName: "ESSA_EXCEPTION_CODE", timestamps: false },
);
