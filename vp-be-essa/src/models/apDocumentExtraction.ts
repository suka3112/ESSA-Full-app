import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApDocumentExtraction extends Model {
  ExtractionId: number;
  DocumentId: number;
  InvoiceHeaderId: number | null;
  FieldName: string;
  FieldValue: string | null;
  NormalizedValue: string | null;
  Confidence: number | null;
  PageNo: number | null;
  SourceText: string | null;
}

ApDocumentExtraction.init(
  {
    ExtractionId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    DocumentId: { type: DataTypes.BIGINT },
    InvoiceHeaderId: { type: DataTypes.INTEGER },
    FieldName: { type: DataTypes.STRING(100) },
    FieldValue: { type: DataTypes.TEXT },
    NormalizedValue: { type: DataTypes.TEXT },
    Confidence: { type: DataTypes.DECIMAL(5, 2) },
    PageNo: { type: DataTypes.INTEGER },
    SourceText: { type: DataTypes.TEXT },
    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("NOW()"),
    },
  },
  {
    sequelize,
    tableName: "AP_DOCUMENT_EXTRACTION",
    timestamps: false,
  },
);
