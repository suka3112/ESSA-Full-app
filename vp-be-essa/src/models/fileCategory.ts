import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class FileCategory extends Model {
  id: number;
  title: string;
  is_deleted: boolean;
}

FileCategory.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      // Postgres column is case-sensitive: ID
      field: "ID",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      // Postgres column is Name (not title)
      field: "Name",
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      // Postgres column is case-sensitive: Is_deleted
      field: "Is_deleted",
    },
  },
  {
    tableName: "FILE_CATEGORY",
    sequelize,
    timestamps: false,
  },
);
