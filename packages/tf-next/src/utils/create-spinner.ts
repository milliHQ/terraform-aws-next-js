import ora from 'ora';

/**
 * Same spinner configuration as Next.js
 * @see {@link https://github.com/vercel/next.js/blob/canary/packages/next/build/spinner.ts}
 */
const dotsSpinner = {
  frames: ['.', '..', '...'],
  interval: 200,
};

function createSpinner(text: string) {
  const spinner = ora({ spinner: dotsSpinner, prefixText: text });

  return spinner;
}

export { createSpinner };
