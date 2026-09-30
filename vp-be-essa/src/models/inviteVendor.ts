import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class InviteVendor extends Model {
  ID!: number;
  Vendor_Name!: string;
  Email!: string;
  CoCd!: number;
}

InviteVendor.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    Vendor_Name: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    Email: {
      type: DataTypes.STRING(241),
    },
    CoCd: {
      type: DataTypes.INTEGER,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("NOW()"),
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
    },
  },
  {
    sequelize,
    tableName: "INVITE_VENDOR",
    timestamps: false,
  },
);
