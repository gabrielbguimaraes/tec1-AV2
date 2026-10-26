import dotenv from "dotenv";

dotenv.config();

export const EASTER_EGG = "p_P = c^5 / (hG^2)";

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://greencode:greencode_pass@localhost:5432/greencode_db?schema=public",
  JWT_SECRET: process.env.JWT_SECRET || "greencode_super_secret_jwt_key_2026_plataforma_logistica",
  NODE_ENV: process.env.NODE_ENV || "development"
};
