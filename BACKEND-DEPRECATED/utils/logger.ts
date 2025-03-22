import chalk from 'chalk';

const COLORS = {
  mainBlue: '#5FADEB',
  secondaryBlue: '#4A9BD9',
  pureWhite: '#FFFFFF',
  lightGray: '#CCCCCC',
  dimGray: '#808080',
};

export class Logger {
  private static instance: Logger;
  private isDebugEnabled: boolean = false;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setDebug(enabled: boolean): void {
    this.isDebugEnabled = enabled;
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    console.log(chalk.blue(`[INFO] ${message}`), ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.log(chalk.yellow(`[WARN] ${message}`), ...args);
  }

  warning(message: string, ...args: any[]): void {
    console.log(chalk.yellow(`[WARNING] ${message}`), ...args);
  }

  error(message: string, error?: any): void {
    console.error(chalk.red(`[ERROR] ${message}`));
    if (error) {
      console.error(chalk.red(error));
    }
  }

  file(path: string, line?: number): void {
    const lineInfo = line ? `:${line}` : '';
    console.log(chalk.cyan(`File: ${path}${lineInfo}`));
  }

  infoWithData(message: string, data?: any) {
    const timestamp = chalk.hex(COLORS.secondaryBlue)(`[${new Date().toISOString()}]`);
    const msg = chalk.hex(COLORS.pureWhite)(message);
    console.log(`${timestamp} ${msg}`, data ? '\n' + JSON.stringify(data, null, 2) : '');
  }

  successWithData(message: string, data?: any) {
    const timestamp = chalk.hex(COLORS.secondaryBlue)(`[${new Date().toISOString()}]`);
    const status = chalk.hex(COLORS.mainBlue)('SUCCESS');
    const msg = chalk.hex(COLORS.pureWhite)(message);
    console.log(`${timestamp} ${status} ${msg}`, data ? '\n' + JSON.stringify(data, null, 2) : '');
  }

  errorWithData(message: string, error?: any) {
    const timestamp = chalk.hex(COLORS.secondaryBlue)(`[${new Date().toISOString()}]`);
    const status = chalk.red('ERROR');
    const msg = chalk.hex(COLORS.pureWhite)(message);
    console.error(`${timestamp} ${status} ${msg}`, error ? '\n' + error : '');
  }

  debugWithData(message: string, data?: any) {
    const timestamp = chalk.hex(COLORS.secondaryBlue)(`[${new Date().toISOString()}]`);
    const status = chalk.hex(COLORS.dimGray)('DEBUG');
    const msg = chalk.hex(COLORS.lightGray)(message);
    console.debug(`${timestamp} ${status} ${msg}`, data ? '\n' + JSON.stringify(data, null, 2) : '');
  }

  warnWithData(message: string, data?: any) {
    const timestamp = chalk.hex(COLORS.secondaryBlue)(`[${new Date().toISOString()}]`);
    const status = chalk.yellow('WARN');
    const msg = chalk.hex(COLORS.pureWhite)(message);
    console.warn(`${timestamp} ${status} ${msg}`, data ? '\n' + JSON.stringify(data, null, 2) : '');
  }

  fileWithSize(path: string, size?: string) {
    const pathPart = chalk.hex(COLORS.mainBlue)(path);
    const sizePart = size ? chalk.hex(COLORS.dimGray)(` (${size})`) : '';
    console.log(`  → ${pathPart}${sizePart}`);
  }

  directory(path: string) {
    console.log(`  📦 ${chalk.hex(COLORS.mainBlue)(path)}/`);
  }

  progress(current: number, total: number, message: string) {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    const percentageText = chalk.hex(COLORS.secondaryBlue)(`(${current}/${total})`);
    const msg = chalk.hex(COLORS.lightGray)(message);
    console.log(`${progressBar} ${percentageText} ${msg}`);
  }

  metric(label: string, value: string | number) {
    const labelPart = chalk.hex(COLORS.lightGray)(label);
    const valuePart = chalk.hex(COLORS.secondaryBlue)(value);
    console.log(`${labelPart}: ${valuePart}`);
  }

  timing(label: string, ms: number) {
    const labelPart = chalk.hex(COLORS.lightGray)(label);
    const timingPart = chalk.hex(COLORS.secondaryBlue)(`[${ms}ms]`);
    console.log(`${timingPart} ${labelPart}`);
  }

  private createProgressBar(percentage: number): string {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    const filledPart = chalk.hex(COLORS.mainBlue)('█'.repeat(filled));
    const emptyPart = chalk.hex(COLORS.lightGray)('░'.repeat(empty));

    return filledPart + emptyPart;
  }
}

export const logger = Logger.getInstance(); 