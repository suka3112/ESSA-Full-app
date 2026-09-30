import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApDocumentRequestItem extends Model {
  RequestItemId: number;
  RequestId: number;
  DocumentType: string;
  Reason: string;
  TargetDocumentId: number | null;
  Status: string;
  ReceivedDocumentId: number | null;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

ApDocumentRequestItem.init(
  {
    RequestItemId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    RequestId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    DocumentType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    Reason: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    TargetDocumentId: { type: DataTypes.BIGINT },
    Status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PENDING",
    },
    ReceivedDocumentId: { type: DataTypes.BIGINT },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("NOW()"),
    },
    UpdatedAt: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "AP_DOCUMENT_REQUEST_ITEM",
    timestamps: false,
  },
);
