const formatMeta = (meta = {}) => {
  const filteredMeta = Object.entries(meta).reduce((accumulator, [key, value]) => {
    if (value !== undefined) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

  return Object.keys(filteredMeta).length > 0 ? ` ${JSON.stringify(filteredMeta)}` : "";
};

const writeLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`;

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

const logger = {
  info(message, meta) {
    writeLog("info", message, meta);
  },
  warn(message, meta) {
    writeLog("warn", message, meta);
  },
  error(message, meta) {
    writeLog("error", message, meta);
  },
};

export { logger };
