import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class PurchaseOrderQuantities extends Model {
    id: number;
    reference_number: number;
    purchase_order_id: number;
    purchase_order_material_id: number;
    quantity: number;
    plant: string;
    scheduled_date: Date;
    is_deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

PurchaseOrderQuantities.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        reference_number: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        purchase_order_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        purchase_order_material_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        plant: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        scheduled_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    },
    {
        tableName: "purchase_order_quantity",
        sequelize,
        timestamps: true,
    },
);
