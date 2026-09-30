import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { User } from "./user";
import { StatusEnum } from "../utils/enums/status.enum";

export class LogisticsInvoice extends Model {
  id: number;
  country_origin: string;
  month_name: string;
  month_number: number;
  factory: string;
  port: string;
  destination_port: string;
  country_final_destination: string;
  inco_terms: string;
  shipping_line: string;
  container_type: string;
  etd: Date;
  eta: Date;
  quantity_ctn: number;
  rate_related: string;
  rate_per_unit: number;
  total_rate: number;
  extra_charges: number;
  reason_extra_charges: string;
  invoice_currency: string;
  vat: number;
  final_invoice_amount: number;
  invoice_number: string;
  invoice_date: Date;
  year: number;
  daikin_reference_sor: string;
  daikin_reference_po: string;
  spot_rate_number: string;
  daikin_requestor_name: string;
  daikin_entity: string;
  vendor_comment: string;
  daikin_comment: string;
  cost_responsible: number;
  user_id: number;
  status: number;
  paymentDueDate: Date;
  is_deleted: boolean;
}

LogisticsInvoice.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    country_origin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    month_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    month_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12,
      },
    },
    factory_warehouse: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    port_airport_origin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    destination_port_airport: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country_final_destination: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    inco_terms: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    shipping_line: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    container_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    etd: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    eta: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    quantity_ctn: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rate_related: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rate_per_unit: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    total_rate: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    extra_charges: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    reason_extra_charges: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    invoice_currency: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vat: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    final_invoice_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    invoice_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    invoice_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    daikin_reference_sor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    daikin_reference_po: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    spot_rate_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    daikin_requestor_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    daikin_entity: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vendor_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    daikin_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cost_responsible: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: StatusEnum["Submitted for Review"],
    },
    paymentDueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
    },
  },
  {
    tableName: "logistics_invoices",
    sequelize,
  },
);

LogisticsInvoice.belongsTo(User, { foreignKey: "cost_responsible", as: "CR" });
