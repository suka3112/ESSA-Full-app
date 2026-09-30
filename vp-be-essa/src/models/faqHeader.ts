import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { User } from "./user";

export class FAQHeader extends Model {
  ID: number;
  title_EN!: string;
  title_AR!: string;
  is_deleted: boolean;
  user_id: number;
  CreatedDt: Date;
}

FAQHeader.init(
  {
    ID: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    title_EN: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title_AR: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: "ID",
      },
      onUpdate: "CASCADE",
    },
    CreatedDt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
  },
  {
    tableName: "FAQ_HEADER",
    sequelize,
    timestamps: false,
  },
);
