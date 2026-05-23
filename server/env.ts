export function applyEnvDefaults(
  env: Record<string, string>,
  target: NodeJS.ProcessEnv = process.env
) {
  Object.entries(env).forEach(([key, value]) => {
    if (target[key] === undefined) {
      target[key] = value;
    }
  });
}

export async function loadServerEnv(mode = process.env.NODE_ENV ?? "development") {
  const { loadEnv } = await import("vite");
  applyEnvDefaults(loadEnv(mode, process.cwd(), ""));
}
