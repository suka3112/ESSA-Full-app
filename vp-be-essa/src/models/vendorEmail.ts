import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class VendorEmail extends Model {
  ID: number;
  Email: string;
  Vendor_Id: number;
  Vendor_Onboard_ID: number;
  Is_Deleted: boolean;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedDt: Date;
  ModifiedBy: number;
  Sorting_Order: number;
}

VendorEmail.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Email: {
      type: DataTypes.STRING(241),
    },
    Vendor_Id: {
      type: DataTypes.INTEGER,
    },
    Vendor_Onboard_ID: {
      type: DataTypes.INTEGER,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
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
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
    },
    Sorting_Order: {
      type: DataTypes.INTEGER,
    },
  },
  {
    sequelize,
    tableName: "VENDOR_EMAIL",
    timestamps: false,
  },
);
