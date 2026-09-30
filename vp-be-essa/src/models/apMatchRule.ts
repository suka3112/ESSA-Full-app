import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

/** One n-way validation rule: read a data point from source A, compare with targets B. */
export class ApMatchRule extends Model {
  RuleId: number;
  RuleKey: string;
  DataPoint: string;
  DataKey: string;
  RuleType: string;
  Scope: string;
  Categories: string[];
  DisabledCategories: string[];
  SourceDoc: string;
  Targets: Array<{ doc: string; requirement: string; field?: string }>;
  CompareMode: string;
  Criteria: Record<string, unknown>;
  CriteriaText: string | null;
  RunCondition: { type: string; text?: string };
  OnFail: string;
  Status: string;
  BusinessNote: string | null;
  NoteBy: string | null;
  ConfirmWith: string | null;
  LinkedCheck: string | null;
  ServerSide: boolean;
  RuleGroup: string | null;
  SourceField: string | null;
  MatchLevel: string;
  IsMandatory: boolean;
  MatrixRefs: string | null;
  DisplayOrder: number;
  IsDeleted: boolean;
  CreatedAt: Date;
  CreatedBy: number | null;
  UpdatedAt: Date | null;
  UpdatedBy: number | null;
}

ApMatchRule.init(
  {
    RuleId: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    RuleKey: { type: DataTypes.STRING(20), allowNull: false },
    DataPoint: { type: DataTypes.STRING(200), allowNull: false },
    DataKey: { type: DataTypes.STRING(60), allowNull: false },
    RuleType: { type: DataTypes.STRING(20), allowNull: false },
    Scope: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "COMMON" },
    Categories: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    DisabledCategories: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    SourceDoc: { type: DataTypes.STRING(40), allowNull: false },
    Targets: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    CompareMode: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "ONE_TO_ALL" },
    Criteria: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    CriteriaText: { type: DataTypes.TEXT, allowNull: true },
    RunCondition: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { type: "ALWAYS", text: "" },
    },
    OnFail: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "REVIEW" },
    Status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "ACTIVE" },
    BusinessNote: { type: DataTypes.TEXT, allowNull: true },
    NoteBy: { type: DataTypes.STRING(200), allowNull: true },
    ConfirmWith: { type: DataTypes.STRING(200), allowNull: true },
    LinkedCheck: { type: DataTypes.STRING(60), allowNull: true },
    ServerSide: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    RuleGroup: { type: DataTypes.STRING(20), allowNull: true },
    SourceField: { type: DataTypes.STRING(200), allowNull: true },
    MatchLevel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "HEADER" },
    IsMandatory: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    MatrixRefs: { type: DataTypes.STRING(200), allowNull: true },
    DisplayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    IsDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("NOW()"),
    },
    CreatedBy: { type: DataTypes.INTEGER, allowNull: true },
    UpdatedAt: { type: DataTypes.DATE, allowNull: true },
    UpdatedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    tableName: "AP_MATCH_RULE",
    timestamps: false,
  },
);
