import chalk from 'chalk';

import { LogLevel } from '../../../types';
import { strlen } from '../../../utils/strlen';
import { createSpinner, StopCallback } from './create-spinner';

type OutputServiceOptions = {
  logLevel: LogLevel;
};

class OutputService {
  private _spinner: StopCallback | null;
  private spinnerMessage: string;
  logLevel: LogLevel;
  isDebug: boolean;

  constructor({ logLevel }: OutputServiceOptions) {
    this.spinnerMessage = '';
    this.logLevel = logLevel;
    this.isDebug = logLevel === 'verbose';
    this._spinner = null;
  }

  print(message: string, prefix?: string) {
    const prefixLength = prefix ? strlen(prefix) : 0;
    const indentNewline = '\n' + ' '.repeat(prefixLength);

    this.stopSpinner();
    const indentedMessage = message.replace(/\n/, indentNewline);
    console.log((prefix || '') + indentedMessage);
  }

  log = (message: string, color = chalk.grey) => {
    this.print(message, color('> '));
  };

  debug = (message: string) => {
    if (this.isDebug) {
      this.print(chalk.gray(message), chalk.blueBright('debug '));
    }
  };

  error = (message: string) => {
    this.print(message, chalk.red('error '));
  };

  success = (message: string) => {
    this.print(message, chalk.green('success '));
  };

  spinner = (message: string, delay = 300): void => {
    this.spinnerMessage = message;
    this._spinner = createSpinner(message, delay);
  };

  stopSpinner = () => {
    if (this._spinner) {
      this._spinner();
      this._spinner = null;
      this.spinnerMessage = '';
    }
  };
}

export { OutputService };
