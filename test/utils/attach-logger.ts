import { EventEmitter } from 'events';
import * as fs from 'fs';

type AttachLoggerResult = {
  /**
   * Detaches the logger from the emitter and closes the write stream to the
   * log file
   */
  stop(): void;
};

/**
 * Attaches a logger to an emitter and puts the logs into a file
 *
 * @param filePath - Path of the file where the logs should be put in
 * @param emitter - Emitter from where the logs should taken, supports `data` and `error` events
 */
function attachLogger<Emitter extends EventEmitter>(
  filePath: string,
  emitter: Emitter
): AttachLoggerResult {
  const writeStream = fs.createWriteStream(filePath, {
    // Open file for appending. The file is created if it does not exist.
    flags: 'a',
  });
  function onData(data: string) {
    writeStream.write(data.toString());
  }
  function onError(data: string) {
    writeStream.write(data.toString());
  }

  emitter.on('data', onData);
  emitter.on('error', onError);

  return {
    stop() {
      emitter.off('data', onData);
      emitter.off('error', onError);

      // Close stream to the log file
      writeStream.close();
    },
  };
}

export { attachLogger };
export type { AttachLoggerResult };
