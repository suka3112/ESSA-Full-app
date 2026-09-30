import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApInboundSharePoint extends Model {
  InboundSharePointId: number;
  DriveItemId: string;
  FileName: string | null;
  FolderPath: string | null;
  MimeType: string | null;
  FileSizeBytes: number | null;
  WebUrl: string | null;
  LastModifiedAt: Date | null;
  SiteId: string | null;
  DriveId: string | null;
  Status: string;
  DocumentId: number | null;
  ErrorMessage: string | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

ApInboundSharePoint.init(
  {
    InboundSharePointId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    DriveItemId: { type: DataTypes.TEXT, allowNull: false },
    FileName: { type: DataTypes.STRING(500) },
    FolderPath: { type: DataTypes.STRING(1000) },
    MimeType: { type: DataTypes.STRING(150) },
    FileSizeBytes: { type: DataTypes.BIGINT },
    WebUrl: { type: DataTypes.STRING(2000) },
    LastModifiedAt: { type: DataTypes.DATE },
    SiteId: { type: DataTypes.STRING(255) },
    DriveId: { type: DataTypes.STRING(255) },
    Status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "QUEUED",
    },
    DocumentId: { type: DataTypes.BIGINT },
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
    tableName: "AP_INBOUND_SHAREPOINT",
    timestamps: false,
  },
);
