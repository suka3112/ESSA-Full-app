import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class MasterCodes extends Model {
  ID!: number;
  Type!: string;
  Code!: string;
  Description_En?: string;
  Description_Ar?: string;
  Param1?: string;
  Param2?: string;
  SortOrder?: number;
}

MasterCodes.init(
  {
    ID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    Type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true,
    },
    Code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      primaryKey: true,
    },
    Description_En: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    Description_Ar: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    Param1: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    Param2: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    SortOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "MASTER_CODES",
    timestamps: false,
  },
);

MasterCodes.beforeBulkCreate(async (instances, options) => {
  if (!instances.length) return;

  const type = instances[0].Type;

  // Get max code for the same type
  const maxCodeEntry = await MasterCodes.findOne({
    where: { Type: type },
    order: [["SortOrder", "DESC"]],
    attributes: ["SortOrder"],
    raw: true,
  });

  let nextCode = maxCodeEntry ? maxCodeEntry.SortOrder + 1 : 1;

  for (const instance of instances) {
    instance.SortOrder = nextCode;
    nextCode++;
  }
});
