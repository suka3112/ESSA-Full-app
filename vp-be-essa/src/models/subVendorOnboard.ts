import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Vendor } from "./vendor";
import { Status } from "./status";

export class SubVendorOnboard extends Model {
  id: number;
  name: string;
  email: string;
  password: string;
  is_2FA: number;
  department_id: number;
  role_id: number;
  designation_id: number;
  vendor_register_id: number;
  entity_id: number;
  phone_number: number;
  is_deleted: boolean;
}

SubVendorOnboard.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    vendor_register_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
  },
  {
    tableName: "vendor_users",
    sequelize,
  },
);

SubVendorOnboard.belongsTo(Vendor, {
  foreignKey: "vendor_register_id",
  targetKey: "ID",
  as: "vendor_details",
});

SubVendorOnboard.belongsTo(Status, {
  foreignKey: "status",
  targetKey: "ID",
  as: "approval_status",
});
