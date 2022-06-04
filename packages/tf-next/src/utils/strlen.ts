/**
 * Removes all chalk color information from a string and returns it's original
 * length.
 */
function strlen(str: string) {
  return str.replace(/\u001b[^m]*m/g, '').length;
}

export { strlen };
