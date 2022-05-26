import { pseudoRandomBytes } from 'crypto';

export function generateRandomId(length: number) {
  return pseudoRandomBytes(length).toString('hex');
}

export function generateRandomBuildId() {
  return generateRandomId(16);
}
