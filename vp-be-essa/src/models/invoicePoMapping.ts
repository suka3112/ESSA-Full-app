import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class InvoiceDetail extends Model {
  id: number;
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

InvoiceDetail.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true, // IDENTITY(1,1)
    },
    Invoice_Header_Id: {
      type: DataTypes.INTEGER,
    },
    PONo: {
      type: DataTypes.STRING(10),
    },
    POLnNo: {
      type: DataTypes.STRING(10),
    },
    Inv_Line_No: {
      type: DataTypes.STRING(10),
    },
    Material_Code: {
      type: DataTypes.STRING(40),
    },
    Material_Description: {
      type: DataTypes.STRING(40),
    },
    NetAmount: {
      type: DataTypes.DECIMAL(18, 3),
    },
    UnitPrice: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Unit_of_measure: {
      type: DataTypes.STRING,
    },
    PO_Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    GR_Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Enter_Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Inv_Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    IR_value: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Plant: {
      type: DataTypes.STRING(5),
    },
    Tax_Amt: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Trading_Partner: {
      type: DataTypes.STRING(10),
    },
    Item_Text: {
      type: DataTypes.STRING(50),
    },
    Clearing_Doc: {
      type: DataTypes.STRING(10),
    },
    Clearing_Dt: {
      type: DataTypes.DATE,
    },
    Clearing_Entry_Dt: {
      type: DataTypes.DATE,
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
    tableName: "INVOICE_DETAIL",
    timestamps: false,
  },
);

InvoiceDetail.beforeCreate(async (instance, options) => {
  // Generate a unique number, e.g., based on timestamp + random digits
  const uniqueNumber =
    `${Date.now()}`.slice(-6) + Math.floor(1000 + Math.random() * 9000);

  instance.Inv_Line_No = uniqueNumber;
});
