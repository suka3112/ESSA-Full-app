import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApSesHeader extends Model {
  SESHeaderId: number;
  SESNo: string;
  PONo: string;
  PRNo: string | null;
  TransactionDate: Date | null;
  ServiceStartDate: Date | null;
  ServiceEndDate: Date | null;
  SESDescription: string | null;
  VendorName: string | null;
  PRDiscipline: string | null;
  Site: string | null;
  POValue: number | null;
  TotalSESValueIDR: number | null;
  TotalSESValueUSD: number | null;
  RemainingPOBalance: number | null;
}

ApSesHeader.init(
  {
    SESHeaderId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    SESNo: { type: DataTypes.STRING(50) },
    PONo: { type: DataTypes.STRING(50) },
    PRNo: { type: DataTypes.STRING(50) },
    TransactionDate: { type: DataTypes.DATE },
    ServiceStartDate: { type: DataTypes.DATE },
    ServiceEndDate: { type: DataTypes.DATE },
    SESDescription: { type: DataTypes.STRING(500) },
    VendorName: { type: DataTypes.STRING(250) },
    PRDiscipline: { type: DataTypes.STRING(150) },
    Site: { type: DataTypes.STRING(250) },
    POValue: { type: DataTypes.DECIMAL(18, 2) },
    TotalSESValueIDR: { type: DataTypes.DECIMAL(18, 2) },
    TotalSESValueUSD: { type: DataTypes.DECIMAL(18, 2) },
    RemainingPOBalance: { type: DataTypes.DECIMAL(18, 2) },
  },
  {
    sequelize,
    tableName: "AP_SES_HEADER",
    timestamps: false,
  },
);
