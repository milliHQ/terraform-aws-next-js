// extract a cookie value from request headers, by cookie name
// const my_cookie_value = extract_cookie(event.Records[0].cf.request.headers,'MYCOOKIENAME');
// returns null if the cookie can't be found
// https://stackoverflow.com/a/55436033/1695906

import { CloudFrontHeaders } from 'aws-lambda';

export function extractCookie(headers: CloudFrontHeaders, cookieName: string) {
  const cookies = headers['cookie'];
  if (!cookies) {
    return null;
  }

  // iterate through each Cookie header in the request, last to first

  for (var n = cookies.length; n--; ) {
    // examine all values within each header value, last to first

    const cval = cookies[n].value.split(/;\ /);
    const vlen = cval.length;

    for (var m = vlen; m--; ) {
      const cookie_kv = cval[m].split('=');
      if (cookie_kv[0] === cookieName) {
        return cookie_kv[1];
      }
    } // for m (each value)
  } // for n (each header)

  // we have no match if we reach this point
  return null;
}
