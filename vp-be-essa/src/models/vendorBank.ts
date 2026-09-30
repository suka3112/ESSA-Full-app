import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class VendorBankData extends Model {
  ID: number;
  Vendor_Id: number;
  Bank_Account_Currency: string;
  Bank_Account_Number: string;
  Bank_Charge_Indicator: string;
  Bank_City: string;
  Bank_Country: string;
  Bank_Name: string;
  Bank_Postal: string;
  Invoice_Currency: string;
  Street_Building_Number: string;
  Swift_Code: string;
  IBAN_Number: string;
  Vendor_SAP_Code: string;
  CreatedDt: Date;
  CreatedBy: number;
  Is_Deleted: boolean;
  Payment_By: string;
  ModifiedBy: number;
  ModifiedDt: Date;
}

VendorBankData.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Vendor_Id: {
      type: DataTypes.INTEGER,
    },
    Bank_Account_Currency: {
      type: DataTypes.STRING(5),
    },
    Bank_Account_Number: {
      type: DataTypes.STRING(18),
    },
    Bank_Charge_Indicator: {
      type: DataTypes.STRING(2),
    },
    Bank_City: {
      type: DataTypes.STRING(35),
    },
    Bank_Country: {
      type: DataTypes.STRING(3),
    },
    Bank_Name: {
      type: DataTypes.STRING(60),
    },
    Bank_Postal: {
      type: DataTypes.STRING(50),
    },
    Invoice_Currency: {
      type: DataTypes.STRING(5),
    },
    Street_Building_Number: {
      type: DataTypes.STRING(70),
    },
    Swift_Code: {
      type: DataTypes.STRING(15),
    },
    IBAN_Number: {
      type: DataTypes.STRING(34),
    },
    Vendor_SAP_Code: {
      type: DataTypes.STRING(10),
    },
    CreatedDt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
    },
    Payment_By: {
      type: DataTypes.STRING(50),
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "VENDOR_BANK",
    sequelize,
    timestamps: false,
  },
);
