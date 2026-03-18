const shouldLog = (level) => {
  const priority = { error: 0, warn: 1, info: 2 };
  const configured = priority[process.env.LOG_LEVEL || "info"] ?? 2;
  return (priority[level] ?? 2) <= configured;
};

const write = (level, message, meta = {}) => {
  if (!shouldLog(level)) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
};

export const logger = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
};