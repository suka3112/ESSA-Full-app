import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApInvoiceConfigVersion extends Model {
  ConfigVersionId: number;
  InvoiceTypeId: number;
  VersionCode: string;
  VersionLabel: string | null;
  EffectiveFrom: string | Date;
  EffectiveTo: string | Date | null;
  Status: string;
  IsDeleted: boolean;
  CreatedAt: Date;
  CreatedBy: number | null;
  UpdatedAt: Date | null;
  UpdatedBy: number | null;
}

ApInvoiceConfigVersion.init(
  {
    ConfigVersionId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    InvoiceTypeId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    VersionCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    VersionLabel: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    EffectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    EffectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    Status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Active",
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    UpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    UpdatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "AP_INVOICE_CONFIG_VERSION",
    timestamps: false,
  },
);
