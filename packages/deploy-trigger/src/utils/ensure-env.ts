/**
 * Ensures that the environment variables
 */
function ensureEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];

  if (typeof value === 'string') {
    return value;
  }

  if (typeof defaultValue === 'string') {
    return defaultValue;
  }

  throw new Error(
    `Environment variable "${key}" is required, but was not set.`
  );
}

export { ensureEnv };
