import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class EssaSlaAudit extends Model {
  Id: number;
  EntityType: string;
  EntityId: number;
  Action: string;
  Detail: string | null;
  Actor: string | null;
  ActorUserId: number | null;
  CreatedDt: Date;
}

EssaSlaAudit.init(
  {
    Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    EntityType: { type: DataTypes.STRING(40), allowNull: false },
    EntityId: { type: DataTypes.INTEGER, allowNull: false },
    Action: { type: DataTypes.STRING(40), allowNull: false },
    Detail: { type: DataTypes.TEXT, allowNull: true },
    Actor: { type: DataTypes.STRING(200), allowNull: true },
    ActorUserId: { type: DataTypes.INTEGER, allowNull: true },
    CreatedDt: { type: DataTypes.DATE, defaultValue: Sequelize.literal("NOW()") },
  },
  { sequelize, tableName: "ESSA_SLA_AUDIT", timestamps: false },
);
