import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class Entity extends Model {
  ID: number;
  Entity_Name: string;
  Entity_Name_AR: string;
  CoCd: string;
  LinkedIn_Link: string;
  Facebook_Link: string;
  Instagram_Link: string;
  Twitter_Link: string;
  YouTube_Link: string;
  ModifiedBy: number;
  ModifiedDt: Date;
  CreatedBy: number;
  CreatedDt: Date;
  Is_Deleted: boolean;
  Vim_Email: any;
}

Entity.init(
  {
    ID: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    Entity_Name: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    Entity_Name_AR: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    CoCd: {
      type: DataTypes.STRING(4),
      allowNull: false,
    },
    LinkedIn_Link: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    Facebook_Link: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    Instagram_Link: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    Twitter_Link: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    YouTube_Link: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    Vim_Email: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "ENTITY",
    sequelize,
    timestamps: false,
    indexes: [
      {
        fields: ["Is_Deleted"],
      },
    ],
  },
);
