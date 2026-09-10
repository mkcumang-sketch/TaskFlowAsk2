import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required for database connection."),
  AUTH_SECRET: z.string().min(8, "AUTH_SECRET must be at least 8 characters long for secure signing."),
  JWT_SECRET: z.string().optional(),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters for secure background job invocation."),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid absolute URL."),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  
  // Optional Integrations
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    
    const message = `[FATAL] Missing or invalid environment configuration:\n${issues}\n`;
    
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    } else {
      console.warn(`[ENV WARNING]\n${message}`);
    }
    
    return process.env as unknown as z.infer<typeof envSchema>;
  }

  return parsed.data;
}

export const env = validateEnv();
