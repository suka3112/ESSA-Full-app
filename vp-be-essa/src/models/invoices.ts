import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { InvoiceDetail } from "./invoicePoMapping";
import { Vendor } from "./vendor";
import { UploadFiles } from "./uploadFiles";
import { User } from "./user";
import { InvoiceCategory } from "./invoicesCategory";
import { Employee } from "./employee";
import { VimStatus } from "./vimStatus";
import { MasterCodes } from "./mastercodes";

export class InvoiceHeader extends Model {
  ID: number;
  CoCd: string;
  Vendor_id: number;
  Invoice_Category_id: number;
  InvNo: string;
  InvDt: Date;
  Document_type: string;
  InvCurr: string;
  Fiscal_year: string;
  Invoice_acc_doc_number: string;
  Invoice_Status_Id: number;
  Payment_Status: string;
  Payment_Terms: string;
  InvAmt: number;
  Tax_amount: number;
  Tax_percentage: number;
  Remarks: string;
  PONo: string;
  Is_Deleted: boolean;
  Is_Document: boolean;
  Is_Paid: boolean;
  Employee_Code: string;
  SAP_invoice_number: string;
  Nature_Of_Expense: string;
  Attachment_type: number;
  Approved_by: number;
  Approved_date: Date;
  Submitted_Date: Date;
  Submitted_By: number;
  Posting_Date: Date;
  Posted_By: number;
  Inv_id_List: any;
  Business_contact: number;
  Invoice_Due_Date: Date;
  checkBox: Boolean;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedDt: Date;
  ModifiedBy: number;
  cr_person_data: any;
  vendorDetails: any;
}

InvoiceHeader.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    CoCd: {
      type: DataTypes.STRING(4),
    },
    Vendor_id: {
      type: DataTypes.INTEGER,
    },
    Invoice_Category_id: {
      type: DataTypes.INTEGER,
    },
    InvNo: {
      type: DataTypes.STRING(10),
    },
    Inv_Type: {
      type: DataTypes.STRING(10),
    },
    Inv_id_List: {
      type: DataTypes.STRING,
    },
    InvDt: {
      type: DataTypes.DATEONLY,
    },
    Document_type: {
      type: DataTypes.STRING(3),
    },
    InvCurr: {
      type: DataTypes.STRING(5),
    },
    Fiscal_year: {
      type: DataTypes.STRING(4),
    },
    Invoice_acc_doc_number: {
      type: DataTypes.STRING(16),
    },
    Invoice_Status_Id: {
      type: DataTypes.INTEGER,
    },
    Payment_Status: {
      type: DataTypes.STRING(10),
    },
    Payment_Terms: {
      type: DataTypes.STRING(4),
    },
    Payment_Advice: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    InvAmt: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Tax_amount: {
      type: DataTypes.DECIMAL(18, 3),
    },
    Tax_percentage: {
      type: DataTypes.INTEGER,
    },
    Remarks: {
      type: DataTypes.STRING(50),
    },
    PONo: {
      type: DataTypes.STRING(10),
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Is_Document: {
      type: DataTypes.BOOLEAN,
    },
    Is_Paid: {
      type: DataTypes.BOOLEAN,
    },
    Employee_Code: {
      type: DataTypes.STRING(4),
    },
    SAP_invoice_number: {
      type: DataTypes.STRING(10),
    },
    Nature_Of_Expense: {
      type: DataTypes.STRING(20),
    },
    Attachment_type: {
      type: DataTypes.INTEGER,
    },
    Approved_by: {
      type: DataTypes.INTEGER,
    },
    Approved_date: {
      type: DataTypes.DATE,
    },
    Submitted_Date: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
    Submitted_By: {
      type: DataTypes.INTEGER,
    },
    Posting_Date: {
      type: DataTypes.DATE,
    },
    Posted_By: {
      type: DataTypes.INTEGER,
    },
    Business_contact: {
      type: DataTypes.INTEGER,
    },
    Invoice_Due_Date: {
      type: DataTypes.DATE,
    },
    checkBox: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
      defaultValue: Sequelize.literal("NOW()"),
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
    },
    Is_CR_Approved: {
      type: DataTypes.BOOLEAN,
    },
    CR_Approved_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Is_Manager_Approved: {
      type: DataTypes.BOOLEAN,
    },
    Manager_Approved_Dt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Is_Manager1_Approved: {
      type: DataTypes.BOOLEAN,
    },
    Manager1_Approved_Dt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Is_Final_Mail_Triggered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Logistics_XLS: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    Original_FileName: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "INVOICE_HEADER",
    timestamps: false,
  },
);

InvoiceHeader.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "upload_files",
});

InvoiceHeader.belongsTo(User, {
  foreignKey: "CreatedBy",
  targetKey: "ID", // optional, ID is default
  as: "created_person", // alias
});

InvoiceHeader.belongsTo(User, {
  foreignKey: "Business_contact",
  targetKey: "ID", // optional, ID is default
  as: "cr_person", // alias
});

InvoiceHeader.belongsTo(Employee, {
  foreignKey: "Business_contact",
  targetKey: "ID", // optional, ID is default
  as: "cr_person_data", // alias
});

InvoiceHeader.hasMany(InvoiceDetail, {
  sourceKey: "ID",
  foreignKey: "Invoice_Header_Id",
  as: "invoicedetails",
});

InvoiceHeader.belongsTo(InvoiceCategory, {
  foreignKey: "Invoice_Category_id",
  targetKey: "ID", // optional, ID is default
  as: "category", // alias
});

InvoiceHeader.belongsTo(Vendor, {
  foreignKey: "Vendor_id",
  targetKey: "ID", // optional, ID is default
  as: "vendorDetails",
});

InvoiceHeader.hasOne(VimStatus, {
  sourceKey: "Invoice_Status_Id",
  foreignKey: "Status_code",
  as: "status",
});

InvoiceHeader.hasOne(MasterCodes, {
  sourceKey: "Nature_Of_Expense",
  foreignKey: "Code", // optional, ID is default
  as: "natureOfExpenses", // alias
});
