import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Entity } from "./entity";

export class EmployeeEntityMapping extends Model {
  ID!: number;
  Employee_Code!: string;
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
  Remarks!: string;
  Manager1_code!: number;
  Additional_documents!: string;
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

EmployeeEntityMapping.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    Employee_Code: {
      type: DataTypes.STRING(10),
    },
    CoCd: {
      type: DataTypes.STRING(8),
    },
    Is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Is_deleted: {
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
    tableName: "EMPLOYEE_ENTITY_MAPPING",
    sequelize,
    indexes: [
      {
        fields: ["Is_deleted", "Is_active"],
      },
    ],
    timestamps: false,
  },
);

EmployeeEntityMapping.belongsTo(Entity, {
  foreignKey: "CoCd",
  targetKey: "CoCd",
  as: "entity_details",
});
