import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Fn } from "sequelize/types/utils";
import { Vendor } from "./vendor";

export interface VendorReconciliationEntry {
  Category: string;
  Vendor_Code: string;
  CoCd: string;
  Document_Number: string;
  Reference: string;
  Document_Date: Date | Fn;
  Curr: string;
  Amount: number;
  Due_Date: Date | Fn;
  ReconStatus: string;
  ReconDetails: string;
}

export class VendorReconciliation extends Model {
  ID: number;
  Category: string;
  Vendor_Code: string;
  CoCd!: string;
  Document_Number!: string;
  Reference!: string;
  Document_Date!: Date | Fn;
  Curr!: string;
  Amount!: number;
  Due_Date!: Date | Fn;
  ReconStatus!: string;
  ReconDetails!: string;
}

VendorReconciliation.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Category: { type: DataTypes.STRING(10) },
    Vendor_Code: { type: DataTypes.STRING(10) },
    CoCd: { type: DataTypes.STRING(4) },
    InvType: { type: DataTypes.STRING(20) },
    Document_Number: { type: DataTypes.STRING(50) },
    Reference: { type: DataTypes.STRING(50) },
    Document_Date: { type: DataTypes.DATE },
    Curr: { type: DataTypes.STRING(20) },
    Amount: { type: DataTypes.DECIMAL(16, 2) },
    Due_Date: { type: DataTypes.DATE },
    ReconStatus: { type: DataTypes.STRING(10) },
    ReconDetails: { type: DataTypes.STRING },
    CreatedDt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("NOW()"),
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "VENDOR_RECONCILIATION",
    timestamps: false,
    indexes: [
      {
        fields: ["Reference"],
      },
    ],
  },
);

VendorReconciliation.belongsTo(Vendor, {
  foreignKey: "Vendor_Code",
  targetKey: "Vendor_SAP_Code",
  as: "Vendor",
});
