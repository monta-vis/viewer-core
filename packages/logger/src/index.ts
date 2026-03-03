export interface LogTransport {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const consoleTransport: LogTransport = {
  info: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

let transport: LogTransport = consoleTransport;

export function configureLogger(t: LogTransport): void {
  transport = t;
}

export const logger = {
  info: (...args: unknown[]) => transport.info(...args),
  warn: (...args: unknown[]) => transport.warn(...args),
  error: (...args: unknown[]) => transport.error(...args),
};
