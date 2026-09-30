import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class AdvancePaymentInvoiceMapping extends Model {
  ID!: number;
  Advance_Payment_Id!: number;
  Invoice_Header_Id!: number;
  Invoice_Number!: string;
  CreatedDt!: Date;
  CreatedBy!: number;
  ModifiedDt!: Date;
  ModifiedBy!: number;
}

AdvancePaymentInvoiceMapping.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Advance_Payment_Id: {
      type: DataTypes.INTEGER,
    },
    PO_Header_Id: {
      type: DataTypes.STRING(10),
    },
    CreatedDt: {
      type: DataTypes.DATE,
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
    sequelize,
    tableName: "ADVANCE_PO_MAPPING",
    timestamps: false,
  },
);
