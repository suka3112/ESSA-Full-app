import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ApDocumentRequest extends Model {
  RequestId: number;
  PrimaryDocumentId: number;
  Status: string;
  VendorEmail: string | null;
  Subject: string | null;
  GraphDraftMessageId: string | null;
  CreatedBy: number | null;
  CreatedAt: Date;
  ClosedAt: Date | null;
}

ApDocumentRequest.init(
  {
    RequestId: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    PrimaryDocumentId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    Status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "OPEN",
    },
    VendorEmail: { type: DataTypes.STRING(320) },
    Subject: { type: DataTypes.STRING(1000) },
    GraphDraftMessageId: { type: DataTypes.TEXT },
    CreatedBy: { type: DataTypes.INTEGER },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("NOW()"),
    },
    ClosedAt: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "AP_DOCUMENT_REQUEST",
    timestamps: false,
  },
);
