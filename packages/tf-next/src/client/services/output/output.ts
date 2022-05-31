import chalk from 'chalk';

import { LogLevel } from '../../../types';
import { createSpinner, StopCallback } from './create-spinner';

type OutputServiceOptions = {
  logLevel: LogLevel;
};

class OutputService {
  private _spinner: StopCallback | null;
  private spinnerMessage: string;
  logLevel: LogLevel;

  constructor({ logLevel }: OutputServiceOptions) {
    this.spinnerMessage = '';
    this.logLevel = logLevel;
    this._spinner = null;
  }

  log = (message: string, color = chalk.grey) => {
    console.log(color(message));
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
