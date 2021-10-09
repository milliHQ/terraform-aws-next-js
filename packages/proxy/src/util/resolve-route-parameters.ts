/**
 * Replaces parameters inside a route with the given parameters
 *
 * @param str - Input string
 * @param match - Matcher result from RegExp.exec
 * @param keys - Named keys from matcher result (contains the values)
 * @returns String with all parameters replaced by values
 */
function resolveRouteParameters(
  str: string,
  match: RegExpExecArray,
  keys: string[]
): string {
  return str.replace(/\$([1-9a-zA-Z_]+)/g, (_, param) => {
    let matchIndex: number = keys.indexOf(param);
    if (matchIndex === -1) {
      // It's a number match, not a named capture
      matchIndex = parseInt(param, 10);
    } else {
      // For named captures, add one to the `keys` index to
      // match up with the RegExp group matches
      matchIndex++;
    }
    return match[matchIndex] || '';
  });
}

export { resolveRouteParameters };
