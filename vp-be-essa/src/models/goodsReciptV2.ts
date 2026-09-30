import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { PoLineItem } from "./poLineItem";

export class GoodsReceiptV2 extends Model {
    id: number;
    vendor_id: number;
    entity_id: number;
    purchase_order_id: number;
    purchase_order_material_id: number;
    gr_number: number;
    gr_item_number: number;
    po_number: number;
    gr_quantity: number;
    ir_raised: number;
    ir_id: number;
    ir_date: Date;
    delivery_date: Date;
    is_deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

GoodsReceiptV2.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        entity_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        gr_number: {
            type: DataTypes.STRING(10),
            allowNull: true,
            field: "GR_number",
        },
        gr_line_item_number: {
            type: DataTypes.STRING(4),
            allowNull: true,
        },
        gr_quantity: {
            type: DataTypes.DECIMAL(18, 3),
            allowNull: true,
            field: "GR_quantity",
        },
        po_number: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        line_item_number: {
            type: DataTypes.STRING, // Default 255 length
            allowNull: true,
        },
        delivery_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        fiscal_year: {
            type: DataTypes.STRING(4),
            allowNull: true,
            field: "Fiscal_year",
        },
        remarks_header: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        gr_document_date: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "GR_Document_date",
        },
        plant: {
            type: DataTypes.STRING(4),
            allowNull: true,
        },
        unit_of_measure: {
            type: DataTypes.STRING(3),
            allowNull: true,
            field: "Unit_of_measure",
        },
        gr_value: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true,
            field: "GR_value",
        },
        vendor_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "Vendor_id",
        },
        ir_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        ir_raised: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: "Is_deleted",
        },
        purchase_order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        purchase_order_material_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
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
        tableName: "GOODS_RECEIPT",
        sequelize,
        timestamps: true,
    },
);

GoodsReceiptV2.hasOne(PoLineItem, {
    sourceKey: "purchase_order_material_id",
    foreignKey: "id",
    as: "material",
});
