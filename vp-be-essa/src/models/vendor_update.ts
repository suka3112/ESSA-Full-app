import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Vendor } from "./vendor";

export class VendorUpdate extends Model {
    id!: number;
    vendor_id!: number;
    data!: object;
    status!: number;
    edited_by?: number;
    is_deleted!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
}

VendorUpdate.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        vendor_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        data: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        previousData: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        edited_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: "vendor_update",
        timestamps: true,
    },
);

VendorUpdate.belongsTo(Vendor, { foreignKey: "vendor_id", as: "vendor" });
