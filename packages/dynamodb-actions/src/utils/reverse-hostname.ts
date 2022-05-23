/**
 * Reverses the groups of a hostname.
 * e.g. sub.example.com -> com.example.sub
 */
function reverseHostname(hostname: string) {
  return hostname.split('.').reverse().join('.');
}

export { reverseHostname };
