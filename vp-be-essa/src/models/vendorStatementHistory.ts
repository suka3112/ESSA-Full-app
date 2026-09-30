import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class VendorStatementHistory extends Model {
  ID: number;
  CoCd!: string;
  Vendor_SAP_Code!: string;
  DocType!: string;
  Reference!: string;
  DocDate!: Date;
  Amount!: number;
  Curr!: string;
  DueDate!: Date;
  EntryDate!: Date;
  Reconciliation_comments!: string;
  Reconciliation_status!: number;
  Reconciliation_date!: Date;
}

VendorStatementHistory.init(
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
    tableName: "VENDOR_STATEMENT_HISTORY",
    timestamps: false,
  },
);
