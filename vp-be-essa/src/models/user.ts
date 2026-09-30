import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Vendor } from "./vendor";
import { UserRole } from "./userRole";
import { Employee } from "./employee";
import { Status } from "./status";
import { Entity } from "./entity";

export class User extends Model {
  ID: number;
  Name: string;
  CoCd: string;
  Vendor_Id: number;
  Employee_Id: number;
  Employee_Code: string;
  Email: string;
  Is_Deleted: boolean;
  LastPasswordResetRequest: Date;
  Password: string;
  Phone_Number: string;
  ResetPasswordExpires: Date;
  ResetPasswordToken: string;
  Role_id: number;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedBy: number;
  ModifiedDt: Date;
  Primary_User: Boolean;
  Is_CR_Approved: boolean;
  CR_Approved_date: Date;
  Is_Manager_Approved: boolean;
  Manager_Approved_Dt: Date;
  Is_Active: boolean;
  vendor: Vendor;
  employee: Employee;
  Is_User: any;
  New_Login: any;
  Last_Login: Date;
  Vendor_Role: string;
}

User.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Name: {
      type: DataTypes.STRING(100),
    },
    CoCd: {
      type: DataTypes.STRING(4),
    },
    Vendor_Id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },
    Employee_Id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Employee_Code: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    Email: {
      type: DataTypes.STRING(241),
      unique: true,
      allowNull: false,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    LastPasswordResetRequest: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    Password: {
      type: DataTypes.STRING(255),
    },
    Phone_Number: {
      type: DataTypes.STRING(50),
    },
    ResetPasswordExpires: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    ResetPasswordToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    Vendor_Role: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    Role_id: {
      type: DataTypes.INTEGER,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    Status: {
      type: DataTypes.INTEGER,
    },
    Primary_User: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Is_CR_Approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    CR_Approved_date: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    Is_Manager_Approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Manager_Approved_Dt: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    Image: {
      type: DataTypes.STRING(),
      defaultValue: null,
    },
    Is_Supplier: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      // Postgres column is case-sensitive: IS_Supplier (not Is_Supplier)
      field: "IS_Supplier",
    },
    Is_Active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    Is_User: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    New_Login: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    Last_Login: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "USERS",
    sequelize,
    timestamps: false,
  },
);

User.belongsTo(Vendor, {
  foreignKey: "Vendor_Id",
  targetKey: "ID",
  as: "vendor",
});

User.belongsTo(Employee, {
  foreignKey: "Employee_Id",
  targetKey: "ID",
  as: "employee",
});

User.belongsTo(Status, {
  foreignKey: "Status",
  targetKey: "ID",
  as: "statusus",
});

User.belongsTo(UserRole, {
  foreignKey: "Role_id",
  targetKey: "ID",
  as: "user_role",
});

User.belongsTo(Entity, {
  foreignKey: "CoCd",
  targetKey: "CoCd",
  as: "entity_details",
});
