import { Sequelize } from "sequelize";
import { dbConfig } from "./dbConfig";

export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: "postgres",
    logging: dbConfig.logging,
    dialectOptions: dbConfig.dialectOptions,
    pool: dbConfig.pool,
  }
);

export const verifyDBConnection = async () => {
  // Verify Database connection
  return await sequelize.authenticate();
};
