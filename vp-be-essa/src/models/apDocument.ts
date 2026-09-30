import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApDocument extends Model {
  DocumentId: number;
  InvoiceHeaderId: number | null;
  DocumentType: string;
  OriginalFileName: string | null;
  StoredFilePath: string | null;
  MimeType: string | null;
  FileSizeBytes: number | null;
  ExtractionStatus: string | null;
  OverallConfidence: number | null;
  UploadedBy: number | null;
  UploadedAt: Date;
  LifecycleStatus: string;
  VersionNo: number;
  SupersedesDocumentId: number | null;
}

ApDocument.init(
  {
    DocumentId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    InvoiceHeaderId: { type: DataTypes.INTEGER },
    DocumentType: { type: DataTypes.STRING(50) },
    OriginalFileName: { type: DataTypes.STRING(1000) },
    StoredFilePath: { type: DataTypes.STRING(500) },
    MimeType: { type: DataTypes.STRING(100) },
    FileSizeBytes: { type: DataTypes.BIGINT },
    ExtractionStatus: { type: DataTypes.STRING(50) },
    OverallConfidence: { type: DataTypes.DECIMAL(5, 2) },
    UploadedBy: { type: DataTypes.INTEGER },
    UploadedAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("NOW()"),
    },
    LifecycleStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    VersionNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    SupersedesDocumentId: { type: DataTypes.BIGINT },
  },
  {
    sequelize,
    tableName: "AP_DOCUMENT",
    timestamps: false,
  },
);
