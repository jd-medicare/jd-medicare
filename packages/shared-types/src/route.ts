import registry from '../api-registry.json';
const map = new Map(registry.map((r) => [r.key, r]));
export function route(key: string, params: Record<string, string> = {}) {
  const r = map.get(key);
  if (!r) throw new Error(`Unknown API route key: ${key}`);
  const path = r.path.replace(/:([A-Za-z]+)/g, (_m, name: string) => {
    const v = params[name];
    if (!v) throw new Error(`Missing param ${name} for ${key}`);
    return encodeURIComponent(v);
  });
  return { method: r.method, path: `/api/v1${path}` };
}
