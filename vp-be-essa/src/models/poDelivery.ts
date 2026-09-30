import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { PoLineItem } from "./poLineItem";

export class PoDelivery extends Model {
    id: number;
    po_number: number;
    reference_number: number;
    vendor_id: number;
    enity_id: number;
    po_date: Date;
    mode_of_transport: string;
    purchase_order_status: number;
    created_person: string;
    created_person_id: number;
    is_gr_raised: boolean;
    is_ir_raised: boolean;
    is_deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

PoDelivery.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        quantity: {
            type: DataTypes.DECIMAL(18, 3),
            allowNull: true,
        },
        scheduled_date: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "Scheduled_date",
        },
        purchase_order_number: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        purchase_order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        purchase_order_material_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: "Is_deleted",
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "PO_DELIVERY_SCHEDULE",
        sequelize,
        timestamps: true,
    },
);

PoDelivery.hasOne(PoLineItem, {
    sourceKey: "purchase_order_material_id",
    foreignKey: "id",
    as: "material",
});
