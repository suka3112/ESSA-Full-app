import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class PoLineItem extends Model {
    id: number;
    purchase_order_id: number;
    reference_number: number;
    material_code: string;
    material_description: string;
    unit_of_measure: string;
    net_price: number;
    ir_quantity: number;
    ir_value: number;
    open_quantity: number;
    status: number;
    is_deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

PoLineItem.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        material_code: {
            type: DataTypes.STRING(40),
            allowNull: true,
        },
        material_description: {
            type: DataTypes.STRING(40),
            allowNull: true,
        },
        net_price: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true,
        },
        unit_of_measure: {
            type: DataTypes.STRING(3),
            allowNull: true,
        },
        history_Category: {
            type: DataTypes.STRING(1),
            allowNull: true,
        },
        movement_Type: {
            type: DataTypes.STRING(3),
            allowNull: true,
        },
        gr_value: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true,
        },
        ir_value: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true,
        },
        po_currency: {
            type: DataTypes.STRING(5),
            allowNull: true,
        },
        ir_quantity: {
            type: DataTypes.DECIMAL(18, 3),
            allowNull: true,
        },
        gr_quantity: {
            type: DataTypes.DECIMAL(18, 3),
            allowNull: true,
        },
        quantity: {
            type: DataTypes.DECIMAL(18, 3),
            allowNull: true,
        },
        purchase_order_number: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        delievery_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        plant: {
            type: DataTypes.STRING(4),
            allowNull: true,
        },
        material_status: {
            type: DataTypes.STRING(1),
            allowNull: true,
        },
        purchase_order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
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
        tableName: "po_line_item",
        sequelize,
        timestamps: true,
    },
);
