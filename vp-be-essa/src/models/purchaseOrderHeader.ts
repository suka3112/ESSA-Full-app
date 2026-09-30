import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { User } from "./user";
import { Vendor } from "./vendor";
import { PODetail } from "./purchaseOrderDetails";

export class POHeader extends Model {
  PONo: string;
  Vendor_id: number;
  PO_date: Date;
  CoCd: string;
  Mode_of_transport: string;
  PO_currency: string;
  Vendor_SAP_Code: string;
  Document_date: Date;
  Purchase_Group: string;
  Payment_Terms: string;
  Incoterms: string;
  Incoterms_Location: string;
  OurRef: string;
  YourRef: string;
  Is_Deleted: boolean;
  Is_GR_raised: boolean;
  Is_IR_raised: boolean;
  POValue: number;
  GRValue: number;
  InvValue: number;
  Total_PO_Qty: number;
  Total_IR_Qty: number;
  Total_GR_Qty: number;
  POStatus: string;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedDt: Date;
  ModifiedBy: number;
}

POHeader.init(
  {
    PONo: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    Vendor_id: {
      type: DataTypes.INTEGER,
    },
    PO_date: {
      type: DataTypes.DATE,
    },
    CoCd: {
      type: DataTypes.STRING(4),
    },
    Mode_of_transport: {
      type: DataTypes.STRING(2),
    },
    PO_currency: {
      type: DataTypes.STRING(5),
    },
    Vendor_SAP_Code: {
      type: DataTypes.STRING(10),
    },
    Document_date: {
      type: DataTypes.DATE,
    },
    Purchase_Group: {
      type: DataTypes.STRING(3),
    },
    Payment_Terms: {
      type: DataTypes.STRING(4),
    },
    Incoterms: {
      type: DataTypes.STRING(4),
    },
    Incoterms_Location: {
      type: DataTypes.STRING(28),
    },
    OurRef: {
      type: DataTypes.STRING(12),
    },
    YourRef: {
      type: DataTypes.STRING(12),
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Is_GR_raised: {
      type: DataTypes.BOOLEAN,
    },
    Is_IR_raised: {
      type: DataTypes.BOOLEAN,
    },
    POValue: {
      type: DataTypes.DECIMAL(18, 3),
    },
    GRValue: {
      type: DataTypes.DECIMAL(18, 3),
    },
    InvValue: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Total_PO_Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Total_IR_Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Total_GR_Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    POStatus: {
      type: DataTypes.STRING(50),
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
    tableName: "PO_HEADER",
    timestamps: false,
  },
);

POHeader.belongsTo(User, { foreignKey: "CreatedBy", as: "created_person" });
POHeader.belongsTo(Vendor, {
  foreignKey: "Vendor_SAP_Code",
  targetKey: "Vendor_SAP_Code",
  as: "vendor",
});

POHeader.hasMany(PODetail, {
  foreignKey: "PONo",
  sourceKey: "PONo",
  as: "pomaterial",
});
