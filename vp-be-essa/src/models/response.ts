import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { User } from "./user";
import { Enquiry } from "./enquiry";
import { UploadFiles } from "./uploadFiles";

export class Response extends Model {
  ID: number;
  Enquiry_Id: number;
  Message: string;
  CreatedDt: Date;
  CreatedBy: number;
  ModifiedDt: Date;
  ModifiedBy: number;
  Is_deleted: boolean;
}

Response.init(
  {
    ID: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    Enquiry_Id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Enquiry,
        key: "ID",
      },
      onUpdate: "CASCADE",
    },
    Message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "ENQUIRY_RESPONSE",
    sequelize,
    timestamps: false,
  },
);

Response.belongsTo(User, {
  foreignKey: "CreatedBy",
  as: "createdByUser",
});

Response.hasMany(UploadFiles, {
  sourceKey: "ID",
  foreignKey: "Main_Id",
  as: "response_file",
});
