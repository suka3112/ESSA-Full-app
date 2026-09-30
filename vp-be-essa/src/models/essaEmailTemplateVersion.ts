import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";
import { EssaEmailTemplate } from "./essaEmailTemplate";
import { User } from "./user";

export class EssaEmailTemplateVersion extends Model {
  Id: number;
  TemplateId: number;
  Version: number;
  Action: string;
  SnapshotJson: string;
  Note: string | null;
  ChangedAt: Date;
  ChangedBy: number | null;
}

EssaEmailTemplateVersion.init(
  {
    Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    TemplateId: { type: DataTypes.INTEGER, allowNull: false },
    Version: { type: DataTypes.INTEGER, allowNull: false },
    Action: { type: DataTypes.STRING(20), allowNull: false },
    SnapshotJson: { type: DataTypes.TEXT, allowNull: false },
    Note: { type: DataTypes.STRING(300), allowNull: true },
    ChangedAt: { type: DataTypes.DATE, defaultValue: Sequelize.literal("NOW()") },
    ChangedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: "ESSA_EMAIL_TEMPLATE_VERSION", timestamps: false },
);

EssaEmailTemplate.hasMany(EssaEmailTemplateVersion, {
  foreignKey: "TemplateId",
  as: "versions",
});
EssaEmailTemplateVersion.belongsTo(EssaEmailTemplate, {
  foreignKey: "TemplateId",
  as: "template",
});
EssaEmailTemplateVersion.belongsTo(User, {
  foreignKey: "ChangedBy",
  targetKey: "ID",
  as: "changer",
});
