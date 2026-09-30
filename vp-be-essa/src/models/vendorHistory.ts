import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class VendorHistory extends Model {
  ID: number;
  Vendor_Id: number;
  Action: "APPROVED" | "REJECTED";
  Changed_By: number;
  Changed_At: Date;
  Old_Data: Record<string, any>;
  New_Data: Record<string, any>;
  Old_Files_Data?: Record<string, any>;
  New_Files_Data?: Record<string, any>;
  Rejection_Reason?: string;
}

VendorHistory.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Vendor_Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "VENDOR", // This should match your Vendor table name
        key: "ID",
      },
    },
    Action: {
      type: DataTypes.ENUM("APPROVED", "REJECTED", "PENDING"),
      allowNull: false,
    },
    Changed_At: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("NOW()"),
    },
    Old_Data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    New_Data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    Old_Files_Data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    New_Files_Data: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    Is_CR_Approved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    Is_Manager_Approved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    Is_Final_Approved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "VendorHistory",
    tableName: "VENDOR_HISTORY",
    timestamps: false,
  },
);

export default VendorHistory;
