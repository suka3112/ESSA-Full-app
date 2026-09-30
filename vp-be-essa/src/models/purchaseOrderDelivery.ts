import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { PODetail } from "./purchaseOrderDetails";

export class PODeliverySchedule extends Model {
  Schedule_Ln_No: string;
  PONo: string;
  POLnNo: string;
  Qty: number;
  Scheduled_date: Date;
  Is_Deleted: boolean;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedDt: Date;
  ModifiedBy: number;
}

PODeliverySchedule.init(
  {
    Schedule_Ln_No: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    PONo: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    POLnNo: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    Qty: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Scheduled_date: {
      type: DataTypes.DATE,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      // Postgres column is case-sensitive: Is_deleted (not Is_Deleted)
      field: "Is_deleted",
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
    tableName: "PO_DELIVERY_SCHEDULE",
    timestamps: false,
  },
);

PODeliverySchedule.hasOne(PODetail, {
  sourceKey: "POLnNo",
  foreignKey: "POLnNo",
  as: "po_detail",
});
