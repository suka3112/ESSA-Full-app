import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { VendorStatementHistory } from "./vendorStatementHistory";
import { Vendor } from "./vendor";
import { VendorReconciliation } from "./vendorReconciliation";

export class VendorStatement extends Model {
  ID: number;
  CoCd!: string;
  Vendor_SAP_Code!: string;
  DocNo!: string;
  PstngDate!: Date;
  DocType!: string;
  Reference!: string;
  DocDate!: Date;
  Amount!: number;
  Curr!: string;
  BaseAmt!: number;
  BaseAmtCurr!: string;
  Text!: string;
  DueDate!: Date;
  EntryDate!: Date;
  GLAccount!: string;
  Reconciliation_comments!: string;
  Reconciliation_status!: number;
  Reconciliation_date!: Date;
  CreatedDt!: Date;
  InvType: any;
}

VendorStatement.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    CoCd: { type: DataTypes.STRING(4) },
    Vendor_SAP_Code: { type: DataTypes.STRING(10) },
    DocNo: { type: DataTypes.STRING(10) },
    PstngDate: { type: DataTypes.DATE },
    DocType: { type: DataTypes.STRING(5) },
    InvType: { type: DataTypes.STRING(20) },
    Reference: { type: DataTypes.STRING(50) },
    DocDate: { type: DataTypes.DATE },
    Amount: { type: DataTypes.DECIMAL(18, 3) },
    Curr: { type: DataTypes.STRING(5) },
    BaseAmt: { type: DataTypes.DECIMAL(18, 3) },
    BaseAmtCurr: { type: DataTypes.STRING(5) },
    Text: { type: DataTypes.STRING(200) },
    DueDate: { type: DataTypes.DATE },
    EntryDate: { type: DataTypes.DATE },
    GLAccount: { type: DataTypes.STRING(10) },
    Reconciliation_comments: { type: DataTypes.STRING },
    Reconciliation_status: {
      type: DataTypes.STRING(50),
    },
    Reconciliation_date: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "VENDOR_STATEMENT",
    timestamps: false,
  },
);

VendorStatement.hasOne(VendorStatementHistory, {
  foreignKey: "Reference", // Linking the Reference field
  sourceKey: "Reference", // This is the field in VendorStatement to match
  as: "VendorStatementHistory", // Alias to use when querying
});

VendorStatement.hasOne(VendorReconciliation, {
  foreignKey: "Document_Number", // Linking the Reference field
  sourceKey: "DocNo", // This is the field in VendorStatement to match
  as: "reconciliationStatus", // Alias to use when querying
});

VendorStatement.belongsTo(Vendor, {
  foreignKey: "Vendor_SAP_Code",
  targetKey: "Vendor_SAP_Code",
  as: "Vendor",
});
