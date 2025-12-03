export interface AppConfig {
  useMockAi: boolean;
  apiBaseUrl: string;
}

const parseBoolean = (val: unknown, fallback: boolean) => {
  if (typeof val === "string") return val.toLowerCase() === "true";
  if (typeof val === "boolean") return val;
  return fallback;
};

export const defaultConfig: AppConfig = {
  useMockAi: parseBoolean(import.meta.env.VITE_USE_MOCK_AI, true),
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/ai",
};
