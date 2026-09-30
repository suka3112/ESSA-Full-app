import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Vendor } from "./vendor";

export class StatementOfAccount extends Model {
  id: number;
  reference: string;
  accounted_date: Date;
  type: number;
  currency: number;
  due_date: Date;
  reconciliation_status: boolean;
  reconciliation_comments?: string;
}

StatementOfAccount.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    vendor_id: {
      type: DataTypes.INTEGER,
    },
    entity_id: {
      type: DataTypes.INTEGER,
    },
    type: {
      type: DataTypes.INTEGER,
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    accounted_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    currency_type: {
      type: DataTypes.STRING,
    },
    currency: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    reconciliation_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reconciliation_comments: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize,
    tableName: "statement_of_account",
    timestamps: true,
  },
);

StatementOfAccount.belongsTo(Vendor, {
  foreignKey: "vendor_id",
  as: "vendorSOAData",
});
