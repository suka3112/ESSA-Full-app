import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class EssaInvoice extends Model {
  Id: number;
  DocumentId: number;
  InvoiceHeaderId: number | null;
  InvoiceNo: string | null;
  InvoiceDate: Date | null;
  VendorName: string | null;
  VendorCode: string | null;
  PoNumber: string | null;
  InvoiceWorkflow: string;
  InvoiceType: string;
  WorkflowStage: string;
  FailedChecks: number;
  OpenExceptions: number;
  SlaDueAt: Date | null;
  SlaBreached: boolean;
  TotalAmount: number | null;
  Currency: string;
  CorrelationId: string | null;
  IsDeleted: boolean;
  CreatedDt: Date;
  CreatedBy: number | null;
  ModifiedDt: Date | null;
  ModifiedBy: number | null;
}

EssaInvoice.init(
  {
    Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    DocumentId: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    InvoiceHeaderId: { type: DataTypes.INTEGER, allowNull: true },
    InvoiceNo: { type: DataTypes.STRING(50), allowNull: true },
    InvoiceDate: { type: DataTypes.DATEONLY, allowNull: true },
    VendorName: { type: DataTypes.STRING(250), allowNull: true },
    VendorCode: { type: DataTypes.STRING(50), allowNull: true },
    PoNumber: { type: DataTypes.STRING(50), allowNull: true },
    InvoiceWorkflow: { type: DataTypes.STRING(10), allowNull: false },
    InvoiceType: { type: DataTypes.STRING(40), allowNull: false },
    WorkflowStage: { type: DataTypes.STRING(30), allowNull: false },
    FailedChecks: { type: DataTypes.INTEGER, defaultValue: 0 },
    OpenExceptions: { type: DataTypes.INTEGER, defaultValue: 0 },
    SlaDueAt: { type: DataTypes.DATE, allowNull: true },
    SlaBreached: { type: DataTypes.BOOLEAN, defaultValue: false },
    TotalAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    Currency: { type: DataTypes.STRING(10), defaultValue: "IDR" },
    CorrelationId: { type: DataTypes.STRING(80), allowNull: true },
    IsDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    CreatedDt: { type: DataTypes.DATE, defaultValue: Sequelize.literal("NOW()") },
    CreatedBy: { type: DataTypes.INTEGER, allowNull: true },
    ModifiedDt: { type: DataTypes.DATE, allowNull: true },
    ModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: "ESSA_INVOICE", timestamps: false },
);
