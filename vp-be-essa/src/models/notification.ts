import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class Notifications extends Model {
  ID: number;
  User_Id: number;
  Vendor_Id: number;
  Entity_Id: string;
  Redirect_Id: number;
  Module_Category_Id: number;
  Message: string;
  Is_Read: boolean;
  Is_Deleted: boolean;
  CreatedBy: number;
  CreatedDt: Date;
  ModifiedBy: number;
  ModifiedDt: Date;
}

Notifications.init(
  {
    ID: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    User_Id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Vendor_Id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Entity_Id: {
      type: DataTypes.STRING(4),
      allowNull: true,
    },
    Redirect_Id: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    Module_Category_Id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Message: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    Is_Read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Is_Clear: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
  },
  {
    tableName: "NOTIFICATION",
    sequelize,
    timestamps: false,
    indexes: [
      {
        fields: ["Is_Deleted"],
      },
    ],
  },
);
