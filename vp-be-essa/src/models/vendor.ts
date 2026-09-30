import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Entity } from "./entity";
import { UploadFiles } from "./uploadFiles";
import { VendorBankData } from "./vendorBank";
import { Vendor_onboard } from "./vendorOnboard";
import { Employee } from "./employee";
import { MasterCodes } from "./mastercodes";

export class Vendor extends Model {
  ID: number;
  Vendor_Name_EN: string;
  Vendor_Name_AR: string;
  Image: string;
  CoCd: string;
  Vendor_SAP_Code: string;
  City: string;
  Country: string;
  Region: string;
  Email: string;
  Phone: string;
  Fax: string;
  Postal_Code: string;
  Street_House_No: string;
  Payment_Terms: string;
  Creditnote_Payment_Terms: string;
  Daikin_Contact_Name: string;
  Incoterms: string;
  Incoterms_Location: string;
  Is_VAT: boolean;
  Taxble_Basis: number;
  Wht_Applicable: boolean;
  Wht_Rate: number;
  Trade_license_number: string;
  License_Expiry_Date: Date;
  Issuing_Authority: string;
  Valid_From: Date;
  VAT_Number: string;
  VAT_Group_Name: string;
  Payment_Method_Supplement: string;
  ABC_Indicator: string;
  National_Id_Expiry_Dt: Date;
  National_Id_No: string;
  CR_Person_Id: number;
  Industry_Type: string;
  Industry_Key: string;
  CreatedDt: Date;
  CreatedBy: number;
  Is_Active: boolean;
  Is_Deleted: boolean;
  Vendor_Onboard_Id: number;
  Short_Payment_Reason: string;
  ModifiedBy: number;
  ModifiedDt: Date;
  cr_person: Employee;
}

Vendor.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Vendor_Name_EN: {
      type: DataTypes.STRING(70),
    },
    Vendor_Name_AR: {
      type: DataTypes.STRING(70),
    },
    Image: {
      type: DataTypes.STRING(),
      defaultValue: null,
    },
    CoCd: {
      type: DataTypes.STRING(4),
    },
    Vendor_SAP_Code: {
      type: DataTypes.STRING(10),
    },
    City: {
      type: DataTypes.STRING(35),
    },
    Country: {
      type: DataTypes.STRING(3),
    },
    Region: {
      type: DataTypes.STRING(5),
    },
    Email: {
      type: DataTypes.STRING(241),
      unique: true,
      allowNull: false,
    },
    Phone: {
      type: DataTypes.STRING(20),
    },
    Fax: {
      type: DataTypes.STRING(30),
    },
    Postal_Code: {
      type: DataTypes.STRING(10),
    },
    Street_House_No: {
      type: DataTypes.STRING(70),
    },
    Payment_Terms: {
      type: DataTypes.STRING(4),
    },
    Creditnote_Payment_Terms: {
      type: DataTypes.STRING(4),
    },
    Daikin_Contact_Name: {
      type: DataTypes.STRING(50),
    },
    Incoterms: {
      type: DataTypes.STRING(4),
    },
    Incoterms_Location: {
      type: DataTypes.STRING(28),
    },
    Is_VAT: {
      type: DataTypes.BOOLEAN,
    },
    Taxble_Basis: {
      type: DataTypes.STRING(20),
    },
    Wht_Applicable: {
      type: DataTypes.BOOLEAN,
    },
    Wht_Rate: {
      type: DataTypes.INTEGER,
    },
    Trade_license_number: {
      type: DataTypes.STRING(60),
    },
    License_Expiry_Date: {
      type: DataTypes.DATE,
    },
    Issuing_Authority: {
      type: DataTypes.STRING(50),
    },
    Valid_From: {
      type: DataTypes.DATE,
    },
    VAT_Number: {
      type: DataTypes.STRING(20),
    },
    VAT_Group_Name: {
      type: DataTypes.STRING(50),
    },
    Payment_Method_Supplement: {
      type: DataTypes.STRING(50),
    },
    ABC_Indicator: {
      type: DataTypes.STRING(1),
    },
    National_Id_Expiry_Dt: {
      type: DataTypes.DATE,
    },
    National_Id_No: {
      type: DataTypes.STRING(50),
    },
    CR_Person_Id: {
      type: DataTypes.INTEGER,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
    },
    Is_Active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    Is_PO_Inline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Non_PO_Access: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Vendor_Onboard_Id: {
      type: DataTypes.INTEGER,
    },
    Short_Payment_Reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal("NOW()"),
    },
    Industry_Type: {
      type: DataTypes.STRING(15),
    },
    Industry_Key: {
      type: DataTypes.STRING(5),
    },
  },
  {
    sequelize,
    tableName: "VENDOR",
    timestamps: false,
  },
);

Vendor.belongsTo(Entity, {
  foreignKey: "CoCd",
  targetKey: "CoCd",
  as: "entity_details",
});

Vendor.belongsTo(MasterCodes, {
  foreignKey: "Payment_Terms",
  targetKey: "Code",
  as: "payment_terms_details",
});

Vendor.belongsTo(MasterCodes, {
  foreignKey: "Creditnote_Payment_Terms",
  targetKey: "Code",
  as: "creditnote_payment_terms_details",
});

Vendor.belongsTo(MasterCodes, {
  foreignKey: "Incoterms",
  targetKey: "Code",
  as: "Incoterms_details",
});

Vendor.belongsTo(MasterCodes, {
  foreignKey: "Industry_Type",
  targetKey: "Code",
  as: "Industry_Type_details",
});

Vendor.belongsTo(MasterCodes, {
  foreignKey: "Industry_Key",
  targetKey: "Code",
  as: "Industry_Key_details",
});

Vendor.belongsTo(Vendor_onboard, {
  foreignKey: "Vendor_Onboard_Id",
  as: "vendor_onboard_data",
});
Vendor.belongsTo(Employee, {
  foreignKey: "CR_Person_Id",
  targetKey: "ID", // optional, ID is default
  as: "cr_person", // alias
});
Vendor.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "licence_image",
});

Vendor.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "profile_picture",
});

Vendor.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "national_id_image",
});

Vendor.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "NDA_image",
});

Vendor.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "bank_image",
});

Vendor.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "payment_image",
});

Vendor.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "vat_image",
});

Vendor.hasOne(VendorBankData, {
  foreignKey: "Vendor_Id", // must match actual column in VendorBankData
  as: "bankDetails",
});
