import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class UploadFiles extends Model {
  public ID!: number;
  public Main_Id!: number;
  public Category_id!: number;
  public Is_deleted?: boolean;
  public Upload_files?: string;
  public Attachment_type?: string;
  public CreatedDt?: Date;
  public CreatedBy?: number;
  public ModifiedDt?: Date;
  public ModifiedBy?: number;
  public Is_VendorOnboard?: boolean;
}

UploadFiles.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Main_Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    Upload_files: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    Attachment_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    File_name: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.literal("NOW()"),
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Is_VendorOnboard: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "UPLOAD_FILES",
    sequelize,
    timestamps: false,
  },
);
