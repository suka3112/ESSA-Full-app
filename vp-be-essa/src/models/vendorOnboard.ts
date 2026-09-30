import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { Status } from "./status";
import { Employee } from "./employee";
import { UploadFiles } from "./uploadFiles";
import { VendorBankOnboard } from "./vendorBankOnboard";
import { StatusEnum } from "../utils/enums/status.enum";
import { Entity } from "./entity";
import { MasterCodes } from "./mastercodes";

export class Vendor_onboard extends Model {
  ID: number;
  Vendor_Name_EN: string;
  Vendor_Name_AR: string;
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
  Application_Number: string;
  Vendor_Id: number;
  Is_CR_Approved: boolean;
  CR_Approved_date: Date;
  Is_Manager_Approved: boolean;
  Manager_Approved_Dt: Date;
  CreatedDt: Date;
  CreatedBy: number;
  Is_Active: boolean;
  Is_Added_To_Vendor: boolean;
  Is_Deleted: boolean;
  Short_Payment_Reason: string;
  Status: number;
  Action: string;
  ModifiedBy: number;
  ModifiedDt: Date;
  cr_person: Employee;
}

Vendor_onboard.init(
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
      allowNull: true,
      set(value) {
        this.setDataValue("License_Expiry_Date", value || null);
      },
    },
    Issuing_Authority: {
      type: DataTypes.STRING(50),
    },
    Valid_From: {
      type: DataTypes.DATE,
      allowNull: true,
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
      allowNull: true,
      set(value) {
        this.setDataValue("National_Id_Expiry_Dt", value || null);
      },
    },
    National_Id_No: {
      type: DataTypes.STRING(50),
    },
    CR_Person_Id: {
      type: DataTypes.INTEGER,
    },
    Industry_Type: {
      type: DataTypes.STRING(15),
    },
    Industry_Key: {
      type: DataTypes.STRING(5),
    },
    Application_Number: {
      type: DataTypes.STRING(10),
      unique: true,
    },
    Vendor_Id: {
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
    Is_Added_To_Vendor: {
      type: DataTypes.BOOLEAN,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Short_Payment_Reason: {
      type: DataTypes.STRING(255),
    },
    Status: {
      type: DataTypes.INTEGER,
      defaultValue: StatusEnum["Submitted for Review"],
    },
    Action: {
      type: DataTypes.STRING(10),
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "VENDOR_ONBOARD",
    sequelize,
    timestamps: false,
  },
);

Vendor_onboard.belongsTo(Status, {
  foreignKey: "Status",
  targetKey: "ID",
  as: "onboard_status",
});

Vendor_onboard.belongsTo(Employee, {
  foreignKey: "CR_Person_Id",
  targetKey: "ID", // optional, ID is default
  as: "cr_person", // alias
});
Vendor_onboard.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "payment_image",
});

Vendor_onboard.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "licence_image",
});
Vendor_onboard.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "national_id_image",
});

Vendor_onboard.belongsTo(VendorBankOnboard, {
  foreignKey: "ID",
  targetKey: "Vendor_Onboard_id",
  as: "bankDetails",
});

Vendor_onboard.beforeCreate(async (instance, options) => {
  // Generate a unique number, e.g., based on timestamp + random digits
  const uniqueNumber =
    `${Date.now()}`.slice(-6) + Math.floor(1000 + Math.random() * 9000);

  instance.Application_Number = uniqueNumber;
});
Vendor_onboard.belongsTo(Entity, {
  foreignKey: "CoCd",
  targetKey: "CoCd",
  as: "entity_details",
});

Vendor_onboard.belongsTo(MasterCodes, {
  //  Vendor_onboard: "Code",
  foreignKey: "Payment_Terms",
  targetKey: "Code",
  as: "payment_terms_details",
});

Vendor_onboard.belongsTo(MasterCodes, {
  // sourceKey: "Creditnote_Payment_Terms",
  foreignKey: "Creditnote_Payment_Terms",
  targetKey: "Code",
  as: "creditnote_payment_terms_details",
});

Vendor_onboard.belongsTo(MasterCodes, {
  //sourceKey: "Incoterms",
  foreignKey: "Incoterms",
  targetKey: "Code",
  as: "Incoterms_details",
});

Vendor_onboard.belongsTo(MasterCodes, {
  //sourceKey: "Industry_Type",
  foreignKey: "Industry_Type",
  targetKey: "Code",
  as: "Industry_Type_details",
});

Vendor_onboard.belongsTo(MasterCodes, {
  //sourceKey: "Industry_Key",
  foreignKey: "Industry_Key",
  targetKey: "Code",
  as: "Industry_Key_details",
});

Vendor_onboard.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "profile_picture",
});

Vendor_onboard.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "NDA_image",
});

Vendor_onboard.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "bank_image",
});

Vendor_onboard.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "vat_image",
});
