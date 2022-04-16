import { URLSearchParams } from 'url';

import { appendQuerystring } from '../../src/util/append-querystring';

describe('Relative URL', () => {
  test('SearchParams', () => {
    const result = appendQuerystring('/test', new URLSearchParams('foo=bar'));
    expect(result).toBe('/test?foo=bar');
  });

  test('Empty SearchParams', () => {
    const result = appendQuerystring('/test', new URLSearchParams());
    expect(result).toBe('/test');
  });

  test('Querystring, empty SearchParams', () => {
    const result = appendQuerystring('/test?foo=bar', new URLSearchParams());
    expect(result).toBe('/test?foo=bar');
  });

  test('Querystring, same SearchParams', () => {
    const result = appendQuerystring(
      '/test?foo=bar',
      new URLSearchParams('foo=bar')
    );
    expect(result).toBe('/test?foo=bar');
  });

  test('Querystring, different SearchParams', () => {
    const result = appendQuerystring(
      '/test?foo=bar',
      new URLSearchParams('bar=foo')
    );
    expect(result).toBe('/test?bar=foo&foo=bar');
  });

  test('Querystring, try to override SearchParams', () => {
    const result = appendQuerystring(
      '/test?foo=bar',
      new URLSearchParams('foo=xxx')
    );
    expect(result).toBe('/test?foo=bar');
  });
});

describe('Absolute URL', () => {
  test('SearchParams', () => {
    const result = appendQuerystring(
      'https://example.org/test',
      new URLSearchParams('foo=bar')
    );
    expect(result).toBe('https://example.org/test?foo=bar');
  });

  test('Empty SearchParams', () => {
    const result = appendQuerystring(
      'https://example.org/test',
      new URLSearchParams()
    );
    expect(result).toBe('https://example.org/test');
  });

  test('Querystring, empty SearchParams', () => {
    const result = appendQuerystring(
      'https://example.org/test?foo=bar',
      new URLSearchParams()
    );
    expect(result).toBe('https://example.org/test?foo=bar');
  });

  test('Querystring, same SearchParams', () => {
    const result = appendQuerystring(
      'https://example.org/test?foo=bar',
      new URLSearchParams('foo=bar')
    );
    expect(result).toBe('https://example.org/test?foo=bar');
  });

  test('Querystring, different SearchParams', () => {
    const result = appendQuerystring(
      'https://example.org/test?foo=bar',
      new URLSearchParams('bar=foo')
    );
    expect(result).toBe('https://example.org/test?bar=foo&foo=bar');
  });

  test('Querystring, try to override SearchParams', () => {
    const result = appendQuerystring(
      'https://example.org/test?foo=bar',
      new URLSearchParams('foo=xxx')
    );
    expect(result).toBe('https://example.org/test?foo=bar');
  });
});
