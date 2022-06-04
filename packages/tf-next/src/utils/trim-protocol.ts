/**
 * Trims the protocol from an input string.
 * E.g. https://example.com becomes example.com
 *
 * @see {@link https://stackoverflow.com/a/8206299/831465}
 */
function trimProtocol(input: string) {
  return input.replace(/(^\w+:|^)\/\//, '');
}

export { trimProtocol };
