export default class Logger {
  static logAction(level: LogLevel, action: string, message: string) {
    console.log(level, action, message);
  }
}

export enum LogLevel {
  LOG_ERROR,
}
