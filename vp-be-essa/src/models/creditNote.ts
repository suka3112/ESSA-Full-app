import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { CreditNoteMapping } from "./creditNoteMapping";
import { Vendor } from "./vendor";
import { StatusEnum } from "../utils/enums/status.enum";

export class CreditNote extends Model {
  id: number;
  vendor_name: string;
  is_active: boolean;
  is_deleted: boolean;
}

CreditNote.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    vendor_id: {
      type: DataTypes.INTEGER,
    },
    entity_id: {
      type: DataTypes.INTEGER,
    },
    credit_invoice_reference: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    invoice_based: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    total_amount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: StatusEnum["Under Review"],
    },
    invoice_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: new DataTypes.BOOLEAN(),
      defaultValue: true,
    },
    is_deleted: {
      type: new DataTypes.BOOLEAN(),
      defaultValue: false,
    },
    attachment_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sap_invoice_number: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    credit_note_acc_number: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    reason_for_credit: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    tax_percentage: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tax_amount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    invoice_acc_doc_number: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    vendor_sap_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    vendor_invoice_number: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    Invoice_status_code: {
      type: DataTypes.STRING(2),
      allowNull: true,
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
    tableName: "credit_note",
    sequelize,
    indexes: [
      {
        fields: ["is_deleted", "is_active"],
      },
    ],
    timestamps: true,
  },
);

CreditNote.hasMany(CreditNoteMapping, {
  foreignKey: "credit_note_id",
  as: "credit_note_invoice_mapping",
});

CreditNote.belongsTo(Vendor, { foreignKey: "vendor_id", as: "vendorInfo" });
