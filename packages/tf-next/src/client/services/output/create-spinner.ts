import ansiEscapes from 'ansi-escapes';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Same spinner configuration as Next.js
 * @see {@link https://github.com/vercel/next.js/blob/canary/packages/next/build/spinner.ts}
 */
const dotsSpinner = {
  frames: ['.', '..', '...'],
  interval: 200,
};

function eraseLines(numberOfLines: number) {
  return ansiEscapes.eraseLines(numberOfLines);
}

type StopCallback = () => void;

function createSpinner(message: string, delay: number = 300) {
  let spinner: ReturnType<typeof ora> | null;

  const timeout = setTimeout(() => {
    spinner = ora({
      spinner: dotsSpinner,
      prefixText: chalk.gray(message),
      color: 'gray',
    });
    spinner.start();
  }, delay);

  const stop = () => {
    clearTimeout(timeout);
    if (spinner) {
      spinner.stop();
      spinner = null;
      eraseLines(1);
    }
  };

  return stop;
}

export type { StopCallback };
export { createSpinner };
