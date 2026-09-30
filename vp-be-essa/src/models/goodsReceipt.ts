import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { PODetail } from "./purchaseOrderDetails";

export class GoodsReceipt extends Model {
  GR_number!: string;
  Fiscal_year!: string;
  CoCd!: string;
  GR_Ln_No!: string;
  Vendor_id!: number;
  Vendor_SAP_Code!: string;
  PONo!: string;
  POLnNo!: string;
  GR_Document_date!: Date;
  GR_quantity!: number;
  GR_value!: number;
  Unit_of_measure!: string;
  Is_deleted!: boolean;
  CreatedDt!: Date;
  CreatedBy!: number;
  ModifiedDt!: Date;
  ModifiedBy!: number;
}

GoodsReceipt.init(
  {
    GR_number: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    Fiscal_year: {
      type: DataTypes.STRING(4),
      allowNull: true,
    },
    CoCd: {
      type: DataTypes.STRING(4),
      allowNull: true,
    },
    GR_Ln_No: {
      type: DataTypes.STRING(4),
      primaryKey: true,
    },
    Vendor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Vendor_SAP_Code: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    PONo: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    POLnNo: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    GR_Document_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    GR_quantity: {
      type: DataTypes.DECIMAL(18, 3),
      allowNull: true,
    },
    GR_value: {
      type: DataTypes.DECIMAL(18, 3),
      allowNull: true,
    },
    Unit_of_measure: {
      type: DataTypes.STRING(3),
      allowNull: true,
    },
    Is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "GOODS_RECEIPT",
    timestamps: false,
  },
);

GoodsReceipt.hasOne(PODetail, {
  sourceKey: "POLnNo",
  foreignKey: "POLnNo",
  as: "po_detail",
});
