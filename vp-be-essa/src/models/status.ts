import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class Status extends Model {
  ID: number;
  Status_code: number;
  Status_classification: string;
  Status_description: string;
  Is_deleted: boolean;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedDt: Date;
  ModifiedBy: number;
}

Status.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Status_code: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Status_classification: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    Status_description: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    Status_description_arabic: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    Is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "STATUS",
    timestamps: false,
  },
);
