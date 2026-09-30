import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { MasterCodes } from "./mastercodes";

export class Employee extends Model {
  ID!: number;
  Employee_Code!: string;
  Employee_Name!: string;
  Department!: number;
  Designation!: number;
  Email!: string;
  CoCd!: number;
  Phone_Number!: string;
  Reporting_Manager!: number;
  Reporting_Manager_Code!: string;
}

Employee.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    Employee_Code: {
      type: DataTypes.STRING(4),
      primaryKey: true,
    },
    Employee_Name: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    Department: {
      type: DataTypes.STRING(100),
    },
    Designation: {
      type: DataTypes.STRING(100),
    },
    Email: {
      type: DataTypes.STRING(241),
    },
    CoCd: {
      type: DataTypes.INTEGER,
    },
    Phone_Number: {
      type: DataTypes.STRING,
    },
    Reporting_Manager: {
      type: DataTypes.INTEGER,
    },
    Reporting_Manager_Code: {
      type: DataTypes.STRING(4),
    },
  },
  {
    sequelize,
    tableName: "EMPLOYEE",
    timestamps: false,
  },
);

Employee.belongsTo(MasterCodes, {
  foreignKey: "Department",
  targetKey: "Code",
  as: "departments",
});

Employee.belongsTo(MasterCodes, {
  foreignKey: "Designation",
  targetKey: "Code",
  as: "Industry_Key_details",
});
