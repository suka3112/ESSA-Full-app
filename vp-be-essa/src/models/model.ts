import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

export class Test extends Model {
  id: number;
  is_deleted: boolean;
}

Test.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "test",
    sequelize,
  },
);
