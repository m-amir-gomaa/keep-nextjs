import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

// Drizzle runs outside Next.js; load the same .env files documented for the app.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
