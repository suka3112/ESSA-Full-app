import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class EssaAuditEvent extends Model {
  Id: number;
  EventId: string;
  EventTime: Date;
  Action: string;
  FieldCode: string | null;
  OldValue: string | null;
  NewValue: string | null;
  ActorId: string | null;
  ActorName: string | null;
  ActorRole: string | null;
  ActorType: string;
  ReasonRemarks: string | null;
  Source: string;
  CorrelationId: string | null;
  Result: string;
  ObjectType: string;
  ObjectId: string;
  InvoiceId: number | null;
  Ip: string | null;
  DetailsJson: string | null;
  OutcomeCode: string | null;
}

EssaAuditEvent.init(
  {
    Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    EventId: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    EventTime: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
    Action: { type: DataTypes.STRING(40), allowNull: false },
    FieldCode: { type: DataTypes.STRING(80), allowNull: true },
    OldValue: { type: DataTypes.TEXT, allowNull: true },
    NewValue: { type: DataTypes.TEXT, allowNull: true },
    ActorId: { type: DataTypes.STRING(80), allowNull: true },
    ActorName: { type: DataTypes.STRING(200), allowNull: true },
    ActorRole: { type: DataTypes.STRING(80), allowNull: true },
    ActorType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "USER" },
    ReasonRemarks: { type: DataTypes.TEXT, allowNull: true },
    Source: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "PORTAL" },
    CorrelationId: { type: DataTypes.STRING(80), allowNull: true },
    Result: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "SUCCESS" },
    ObjectType: { type: DataTypes.STRING(40), allowNull: false },
    ObjectId: { type: DataTypes.STRING(120), allowNull: false },
    InvoiceId: { type: DataTypes.INTEGER, allowNull: true },
    Ip: { type: DataTypes.STRING(80), allowNull: true },
    DetailsJson: { type: DataTypes.TEXT, allowNull: true },
    OutcomeCode: { type: DataTypes.STRING(40), allowNull: true },
  },
  { sequelize, tableName: "ESSA_AUDIT_EVENT", timestamps: false },
);
