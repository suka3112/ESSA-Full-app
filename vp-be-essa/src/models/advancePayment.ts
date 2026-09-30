import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { UploadFiles } from "./uploadFiles";
import { Vendor } from "./vendor";
import { StatusEnum } from "../utils/enums/status.enum";
import { Status } from "./status";
import { User } from "./user";
import { Employee } from "./employee";
import { AdvancePaymentInvoiceMapping } from "./advancePaymentMapping";

export class AdvancePayment extends Model {
  ID!: number;
  Advance_payment_code!: string;
  CoCd!: string;
  Vendor_id!: number;
  Cost_responsible!: number;
  Currency!: string;
  Is_Deleted!: boolean;
  Type_of_invoice!: number;
  Performa_Invoice_Number!: number;
  Advance_Payment_Status!: number;
  Value!: number;
  Advance_payment!: boolean;
  Payment_Advice!: string;
  Advance_payment_raised_by!: number;
  CreatedDt!: Date;
  CreatedBy!: number;
  ModifiedDt!: Date;
  ModifiedBy!: number;
  Submitted_Date!: Date;
  Submitted_By!: number;
}

AdvancePayment.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Advance_payment_code: {
      type: DataTypes.STRING(16),
    },
    CoCd: {
      type: DataTypes.STRING(4),
    },
    Vendor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Cost_responsible: {
      type: DataTypes.INTEGER,
    },
    Currency: {
      type: DataTypes.STRING(5),
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Type_of_invoice: {
      type: DataTypes.INTEGER,
    },
    Performa_Invoice_Number: {
      type: DataTypes.STRING(16),
    },
    Advance_Payment_Status: {
      type: DataTypes.INTEGER,
      defaultValue: StatusEnum["Under Review"], //submitted
    },
    Value: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Payment_Advice: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    Advance_payment_raised_by: {
      type: DataTypes.INTEGER,
    },
    Remarks: {
      type: DataTypes.STRING(50),
    },
    CreatedDt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Submitted_Date: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
    Submitted_By: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "ADVANCE_PAYMENTS",
    sequelize,
    timestamps: false,
  },
);

AdvancePayment.belongsTo(Vendor, { foreignKey: "Vendor_id", as: "vendorInfo" });

AdvancePayment.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "upload_files",
});

AdvancePayment.beforeCreate(async (instance, options) => {
  // Generate a unique number, e.g., based on timestamp + random digits
  const uniqueNumber =
    `${Date.now()}`.slice(-8) + Math.floor(1000 + Math.random() * 9000);

  instance.Advance_payment_code = uniqueNumber;
});

AdvancePayment.belongsTo(Status, {
  foreignKey: "Advance_Payment_Status",
  targetKey: "ID",
  as: "status",
});

AdvancePayment.belongsTo(User, {
  foreignKey: "Cost_responsible",
  targetKey: "ID",
  as: "cr_person",
});

AdvancePayment.belongsTo(Employee, {
  foreignKey: "Cost_responsible",
  targetKey: "ID",
  as: "cr_person_data",
});
AdvancePayment.hasMany(AdvancePaymentInvoiceMapping, {
  foreignKey: "Advance_Payment_Id",
  sourceKey: "ID",
  as: "advance_po_mappings",
});
