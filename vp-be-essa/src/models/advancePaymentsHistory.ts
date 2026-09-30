import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { User } from "./user";
import { InvoiceHeader } from "./invoices";
import { AdvancePayment } from "./advancePayment";

export class AdvancePaymentHistory extends Model {
  id: number;
  type_of_invoice: number;
  value_of_advance_payment: number;
  submission_date: Date;
  currency: string;
  cost_responsible: string;
  attachment_type: string;
  user_id: number;
  po_based_invoice: number;
  non_po_based_invoice: number;
  status: number;
}

AdvancePaymentHistory.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    type_of_invoice: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    po_based_invoice: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: InvoiceHeader,
        key: "id",
      },
      onUpdate: "CASCADE",
    },
    non_po_based_invoice: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: InvoiceHeader,
        key: "id",
      },
      onUpdate: "CASCADE",
    },
    value_of_advance_payment: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    submission_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("NOW()"),
    },
    currency: {
      type: DataTypes.STRING(5),
      allowNull: false,
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
      allowNull: true,
      defaultValue: 1,
    },
    attachment_type: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
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
    vendor_sap_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    sap_invoice_number: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    invoice_acc_doc_number: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    advance_payment: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    payment_due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    payment_advice: {
      type: DataTypes.STRING,
      defaultValue: false,
    },
    advance_payment_raised_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
    },
    advance_payment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM("edit", "delete"),
      allowNull: false,
      defaultValue: "edit",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("NOW()"),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("NOW()"),
    },
  },
  {
    tableName: "advance_payments_history",
    sequelize,
    timestamps: true,
  },
);

AdvancePaymentHistory.belongsTo(AdvancePayment, {
  foreignKey: "id",
  as: "advance_payments",
});
