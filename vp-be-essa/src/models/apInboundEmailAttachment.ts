import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApInboundEmailAttachment extends Model {
  InboundAttachmentId: number;
  InboundEmailId: number;
  AttachmentId: string;
  FileName: string | null;
  MimeType: string | null;
  FileSizeBytes: number | null;
  DocumentId: number | null;
  Status: string;
  ErrorMessage: string | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

ApInboundEmailAttachment.init(
  {
    InboundAttachmentId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    InboundEmailId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    AttachmentId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    FileName: { type: DataTypes.STRING(500) },
    MimeType: { type: DataTypes.STRING(150) },
    FileSizeBytes: { type: DataTypes.BIGINT },
    DocumentId: { type: DataTypes.BIGINT },
    Status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "PENDING",
    },
    ErrorMessage: { type: DataTypes.TEXT },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("NOW()"),
    },
    UpdatedAt: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "AP_INBOUND_EMAIL_ATTACHMENT",
    timestamps: false,
  },
);
