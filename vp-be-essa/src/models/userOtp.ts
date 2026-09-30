import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class User_Otp extends Model {
  ID: number;
  User_Id: number;
  Email: string;
  Expires_at: Date;
  Is_Active: boolean;
  Is_Deleted: boolean;
  Is_Used: boolean;
  otp: number;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedDt: Date;
  ModifiedBy: number;
}

User_Otp.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    User_Id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Email: {
      type: DataTypes.STRING(256),
    },
    Expires_at: {
      type: DataTypes.DATE,
    },
    Is_Active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Is_Used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    otp: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
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
    tableName: "USER_OTP",
    sequelize,
    timestamps: false,
  },
);
