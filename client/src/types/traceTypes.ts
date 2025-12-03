export interface PlanResult {
  tool: string;
  output: Record<string, unknown>;
  error?: string | null;
}
