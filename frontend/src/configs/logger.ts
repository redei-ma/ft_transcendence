const DEV = import.meta.env.DEV;

export const logger = {
  // Levels with context — log/warn/error always on, debug dev-only
  log:    (ctx: string, ...args: unknown[]) => console.log(`[${ctx}]`, ...args),
  warn:   (ctx: string, ...args: unknown[]) => console.warn(`[${ctx}]`, ...args),
  error:  (ctx: string, ...args: unknown[]) => console.error(`[${ctx}]`, ...args),
  debug:  (ctx: string, ...args: unknown[]) => DEV && console.log(`[${ctx}]`, ...args),

  // Game engine channels — all dev-only, same DEV variable
  game:   (...args: unknown[]) => DEV && console.log('[Game]',   ...args),
  net:    (...args: unknown[]) => DEV && console.log('[Net]',    ...args),
  render: (...args: unknown[]) => DEV && console.log('[Render]', ...args),
  input:  (...args: unknown[]) => DEV && console.log('[Input]',  ...args),
};
