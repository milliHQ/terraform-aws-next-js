/**
 * Splits a string at the fist occurrence into two substrings.
 *
 * @param input
 * @param char
 * @param startIndex
 */
function splitAtCharacter(
  input: string,
  char: string,
  startIndex: number = 0
): [string, string] {
  const firstSlashInUrl = input.indexOf(char, startIndex);
  return [
    input.substring(startIndex, firstSlashInUrl),
    input.substring(firstSlashInUrl + char.length),
  ];
}

export { splitAtCharacter };
