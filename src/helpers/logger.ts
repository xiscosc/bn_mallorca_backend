import pino from 'pino';

export const log = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  base: undefined, // Removes pid and hostname
  timestamp: false, // CloudWatch adds its own timestamp
});
