import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class PODetail extends Model {
  PONo: string;
  POLnNo: string;
  Material_Code: string;
  Material_Description: string;
  Qty: number;
  Unit_of_measure: string;
  UnitPrice: number;
  NetAmount: number;
  GR_value: number;
  IR_value: number;
  Inv_Qty: number;
  GR_Qty: number;
  History_Category: string;
  Movement_Type: string;
  Delivery_date: Date;
  Plant: string;
  Material_status: string;
  Is_Deleted: boolean;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedDt: Date;
  ModifiedBy: number;
}

PODetail.init(
  {
    PONo: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    POLnNo: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    Material_Code: {
      type: DataTypes.STRING(40),
    },
    Material_Description: {
      type: DataTypes.STRING(40),
    },
    Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Unit_of_measure: {
      type: DataTypes.STRING(3),
    },
    UnitPrice: {
      type: DataTypes.DECIMAL(18, 3),
    },
    NetAmount: {
      type: DataTypes.DECIMAL(18, 3),
    },
    GR_value: {
      type: DataTypes.DECIMAL(18, 3),
    },
    IR_value: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Inv_Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    GR_Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    History_Category: {
      type: DataTypes.STRING(5),
    },
    Movement_Type: {
      type: DataTypes.STRING(5),
    },
    Delivery_date: {
      type: DataTypes.DATE,
    },
    Plant: {
      type: DataTypes.STRING(5),
    },
    Material_status: {
      type: DataTypes.STRING(15),
    },
    Is_Deleted: {
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
    },
  },
  {
    sequelize,
    tableName: "PO_DETAIL",
    timestamps: false,
  },
);
