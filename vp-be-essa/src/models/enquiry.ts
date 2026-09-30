import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { User } from "./user";
import { UploadFiles } from "./uploadFiles";
import { Vendor } from "./vendor";
import { Status } from "./status";
import { Response } from "./response";
import { Employee } from "./employee";

export class Enquiry extends Model {
  ID: number;
  Vendor_id: number;
  Assigned_contact_person: number;
  Enquiry_status: number;
  Enquiry_type: string;
  CoCd: string;
  Last_updatetime: Date;
  Datetime_submitted: Date;
  Enquiry_code: number;
  Enquiry_description: string;
  Is_deleted: boolean;
  Subject: string;
  Status: number;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedDt: Date;
  ModifiedBy: number;
}

Enquiry.init(
  {
    ID: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    Vendor_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: Vendor,
        key: "ID",
      },
      onUpdate: "CASCADE",
    },
    Assigned_contact_person: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: "ID",
      },
      onUpdate: "CASCADE",
    },
    Enquiry_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Enquiry_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    CoCd: {
      type: DataTypes.STRING(4),
      allowNull: false,
    },
    Last_updatetime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Datetime_submitted: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal("NOW()"),
    },
    Enquiry_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Enquiry_description: {
      type: DataTypes.STRING("MAX"),
      allowNull: false,
    },
    Is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Subject: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal("NOW()"),
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "ENQUIRY",
    sequelize,
    timestamps: false,
  },
);

Enquiry.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "enquiry_files",
});
Enquiry.belongsTo(Vendor, { foreignKey: "Vendor_id", as: "user" });

Enquiry.belongsTo(Employee, {
  foreignKey: "Assigned_contact_person",
  as: "assignedPerson",
});

Enquiry.beforeCreate(async (instance, options) => {
  // Generate a unique number, e.g., based on timestamp + random digits
  const uniqueNumber = parseInt(
    `${Date.now()}`.slice(-4) + Math.floor(1000 + Math.random() * 9000),
    10,
  );

  instance.Enquiry_code = uniqueNumber;
});

Enquiry.belongsTo(Status, {
  foreignKey: "Enquiry_status",
  targetKey: "ID",
  as: "status",
});

Enquiry.hasMany(Response, { as: "response", foreignKey: "Enquiry_Id" });
