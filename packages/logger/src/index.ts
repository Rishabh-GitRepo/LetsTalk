import pino from "pino";

export const createLogger = (requestId?: string) => {
  return pino({
    base: {
      requestId
    }
  });
};