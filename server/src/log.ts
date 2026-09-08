// Minimal structured logger. Emits one JSON object per line (level, time, msg,
// and any structured fields) so hosted log aggregators (Railway, Render, a
// Datadog/Grafana pipeline) can parse and index it. Kept dependency-free and
// small; if we later need redaction, sampling, or transports, this is a drop-in
// place to swap in pino without touching call sites.

type Level = 'debug' | 'info' | 'warn' | 'error';

// LOG_LEVEL gates output; defaults to info. debug < info < warn < error.
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = ORDER[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? ORDER.info;

function emit(level: Level, msg: string, fields?: Record<string, unknown>): void {
  if (ORDER[level] < threshold) return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...fields });
  // error/warn go to stderr, everything else to stdout.
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
};
