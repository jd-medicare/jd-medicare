export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name} (see tests/README.md)`);
  return v;
}
export const optional = (name: string) => process.env[name] || undefined;
export const baseURL = () => process.env.E2E_BASE_URL ?? 'http://localhost:8080';
