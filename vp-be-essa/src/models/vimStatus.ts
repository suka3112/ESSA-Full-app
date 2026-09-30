import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class VimStatus extends Model {
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

VimStatus.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Status_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Status_classification: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    Status_description: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    Is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "VIM_STATUS",
    timestamps: false,
  },
);
