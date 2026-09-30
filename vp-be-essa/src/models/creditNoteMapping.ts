import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { InvoiceHeader } from "./invoices";

export class CreditNoteMapping extends Model {
    id: number;
    vendor_name: string;
    is_active: boolean;
    is_deleted: boolean;
}

CreditNoteMapping.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        credit_note_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        invoice_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        is_active: {
            type: new DataTypes.BOOLEAN(),
            defaultValue: true,
        },
        is_deleted: {
            type: new DataTypes.BOOLEAN(),
            defaultValue: false,
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
        tableName: "credit_note_invoice_mapping",
        sequelize,
        indexes: [
            {
                fields: ["is_deleted", "is_active"],
            },
        ],
        timestamps: true,
    },
);

CreditNoteMapping.hasMany(InvoiceHeader, {
    foreignKey: "id",
    as: "credit_invoices",
});
