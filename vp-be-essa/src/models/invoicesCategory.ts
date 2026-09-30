import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class InvoiceCategory extends Model {
  id: number;
  is_deleted: boolean;
  name_en: string;
  name_ar: string;
  createdDt: Date;
  createdBy: number;
  modifiedDt: Date;
  modifiedBy: number;
}

InvoiceCategory.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Name_En: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    Name_Ar: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("NOW()"),
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "INVOICE_CATEGORY",
    timestamps: false,
  },
);
