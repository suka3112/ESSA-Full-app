import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApInboundEmail extends Model {
  InboundEmailId: number;
  MessageId: string;
  InternetMessageId: string | null;
  FromAddress: string | null;
  Subject: string | null;
  ReceivedAt: Date | null;
  HasAttachments: boolean;
  Status: string;
  VendorId: number | null;
  VendorMatched: boolean;
  ErrorMessage: string | null;
  MailboxFolder: string | null;
  DocumentRequestId: number | null;
  CorrelatedDocumentId: number | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

ApInboundEmail.init(
  {
    InboundEmailId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    MessageId: { type: DataTypes.TEXT, allowNull: false },
    InternetMessageId: { type: DataTypes.STRING(500) },
    FromAddress: { type: DataTypes.STRING(320) },
    Subject: { type: DataTypes.STRING(1000) },
    ReceivedAt: { type: DataTypes.DATE },
    HasAttachments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    Status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "PENDING",
    },
    VendorId: { type: DataTypes.INTEGER },
    VendorMatched: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ErrorMessage: { type: DataTypes.TEXT },
    MailboxFolder: { type: DataTypes.STRING(100) },
    DocumentRequestId: { type: DataTypes.BIGINT },
    CorrelatedDocumentId: { type: DataTypes.BIGINT },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("NOW()"),
    },
    UpdatedAt: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "AP_INBOUND_EMAIL",
    timestamps: false,
  },
);
