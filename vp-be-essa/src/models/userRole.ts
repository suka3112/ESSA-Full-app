import { Model, DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../config/sequelize";

export class UserRole extends Model {
  id: number;
  role: string;
  is_deleted: boolean;
}

UserRole.init(
  {
    ID: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    Role_Name_EN: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    Role_Name_AR: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    Is_Deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    CreatedDt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
    },
    ModifiedDt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("NOW()"),
    },
    ModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "USER_ROLE",
    sequelize,
    timestamps: true,
  },
);
