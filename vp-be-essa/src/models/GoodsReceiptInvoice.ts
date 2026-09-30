import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { PODetail } from "./purchaseOrderDetails";

export class GoodsReceiptInvoice extends Model {
  Invoice_Header_Id: number;
  PONo: string;
  POLnNo: string;
  Inv_Line_No: string;
  Material_Code: string;
  Material_Description: string;
  Unit_of_measure: string;
  PO_Qty: number;
  GR_Qty: number;
  Enter_Qty: number;
  Inv_Qty: number;
  IR_value: number;
  Plant: string;
  Tax_Amt: number;
  Trading_Partner: string;
  Item_Text: string;
  Clearing_Doc: string;
  Clearing_Dt: Date;
  Clearing_Entry_Dt: Date;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedDt: Date;
  ModifiedBy: number;
}

GoodsReceiptInvoice.init(
  {
    CoCd: {
      type: DataTypes.STRING(4), //
      allowNull: true,
    },
    PONo: {
      type: DataTypes.STRING(10),
      primaryKey: true, //
    },
    Fiscal_year: {
      type: DataTypes.STRING(4), //
      allowNull: true,
    },
    Vendor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Document_Number: {
      type: DataTypes.STRING(10), //
    },
    Document_Date: {
      type: DataTypes.DATE, //
    },
    InvoiceNo: {
      type: DataTypes.STRING(50), //
    },
    Vendor: {
      type: DataTypes.STRING(10), //
    },
    POLnNo: {
      type: DataTypes.STRING(6), //
    },
    InvQuantity: {
      type: DataTypes.DECIMAL(18, 3), //
    },
    InvAmt: {
      type: DataTypes.DECIMAL(18, 2), //
    },
    InvCurr: {
      type: DataTypes.STRING(5), //
    },
  },
  {
    sequelize,
    tableName: "GOODS_RECEIPT_INVOICE",
    timestamps: false,
  },
);

GoodsReceiptInvoice.removeAttribute("id");

GoodsReceiptInvoice.hasOne(PODetail, {
  sourceKey: "POLnNo",
  foreignKey: "POLnNo",
  as: "po_detail",
});
