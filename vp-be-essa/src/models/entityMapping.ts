import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Entity } from "./entity";
import { User } from "./user";
import { Status } from "./status";
import { Vendor } from "./vendor";
import { Vendor_onboard } from "./vendorOnboard";
import { Employee } from "./employee";
import { StatusEnum } from "../utils/enums/status.enum";

export class EntityMapping extends Model {
  ID!: number;
  CR_id!: number;
  CoCd!: string;
  Is_active!: boolean;
  Is_deleted!: boolean;
  Status!: number;
  Vendor_id!: number;
  Vendor_onboard_id!: number;
  Extension_request_number!: number;
  Reason_for_extension!: string;
  Approval_date!: Date;
  Approved_by!: number;
  Reason_for_rejection!: string;
  Manager1_code!: number;
  Extension_request_date!: Date;
  Extension_granted_date!: Date;
  Is_CR_approved!: boolean;
  Is_Default_Entity!: boolean;
  Is_manager_approved!: boolean;
  CR_approved_date!: Date;
  Manager_approved_date!: Date;
  CreatedDt!: Date;
  CreatedBy!: number;
  ModifiedDt!: Date;
  ModifiedBy!: number;
}

EntityMapping.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    CR_id: {
      type: DataTypes.INTEGER,
    },
    CoCd: {
      type: DataTypes.STRING(4),
    },
    Is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Status: {
      type: DataTypes.INTEGER,
      defaultValue: StatusEnum["Submitted for Review"],
    },
    Vendor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Vendor_onboard_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Extension_request_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },
    Reason_for_extension: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    Approval_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Reason_for_rejection: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    Manager1_code: {
      type: DataTypes.INTEGER,
    },
    Extension_request_date: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
    Extension_granted_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Is_CR_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Is_manager_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    CR_approved_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Manager_approved_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Is_Default_Entity: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "ENTITY_MAPPING",
    sequelize,
    indexes: [
      {
        fields: ["Is_deleted", "Is_active"],
      },
    ],
    timestamps: false,
  },
);

EntityMapping.belongsTo(Vendor, {
  foreignKey: "Vendor_id",
  targetKey: "ID",
  as: "vendor",
});

EntityMapping.belongsTo(Entity, {
  foreignKey: "CoCd",
  targetKey: "CoCd",
  as: "entity_details",
});

EntityMapping.belongsTo(Vendor_onboard, {
  foreignKey: "Vendor_onboard_id",
  targetKey: "ID",
  as: "vendor_onboard",
});

EntityMapping.belongsTo(User, {
  foreignKey: "Approved_by",
  targetKey: "Employee_Id",
  as: "approvedByEmployee",
});

EntityMapping.belongsTo(Employee, {
  foreignKey: "CR_id",
  targetKey: "ID",
  as: "CR_details",
});

EntityMapping.belongsTo(Status, {
  foreignKey: "Status",
  targetKey: "ID",
  as: "statusus",
});

EntityMapping.beforeCreate(async (instance, options) => {
  // Generate a unique number, e.g., based on timestamp + random digits
  const uniqueNumber = Math.floor(10000000 + Math.random() * 9000000);
  instance.Extension_request_number = uniqueNumber;
});
