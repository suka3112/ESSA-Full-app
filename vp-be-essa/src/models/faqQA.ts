import { FAQHeader } from "./faqHeader";
import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { User } from "./user";

export class FAQQA extends Model {
  ID: number;
  faq_header_id: number;
  question: string;
  answer: string;
  is_deleted: boolean;
  user_id: number;
  CreatedDt: Date;
}

FAQQA.init(
  {
    ID: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    faq_header_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: FAQHeader,
        key: "ID",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    question_EN: {
      type: DataTypes.STRING("MAX"),
      allowNull: false,
    },
    question_AR: {
      type: DataTypes.STRING("MAX"),
      allowNull: false,
    },
    answer_EN: {
      type: DataTypes.STRING("MAX"),
      allowNull: false,
    },
    answer_AR: {
      type: DataTypes.STRING("MAX"),
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
        key: "id",
      },
      onUpdate: "CASCADE",
    },
    CreatedDt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
  },
  {
    tableName: "FAQ_QA",
    sequelize,
    timestamps: false,
  },
);

FAQHeader.hasMany(FAQQA, { foreignKey: "faq_header_id", as: "questions" });
FAQQA.belongsTo(FAQHeader, { foreignKey: "faq_header_id", as: "header" });
