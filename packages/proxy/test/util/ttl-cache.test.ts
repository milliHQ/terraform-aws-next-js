import { performance } from 'perf_hooks';

import { TTLCache } from '../../src/util/ttl-cache';

jest.mock('perf_hooks', () => {
  return {
    performance: {
      now: jest.fn(),
    },
  };
});

describe('TTL cache', () => {
  test('Set and retrieve items from the cache ', () => {
    const cache = new TTLCache<string>(60);

    expect(cache.get('foo')).toBeNull();

    // @ts-ignore
    performance.now.mockReturnValue(0);
    cache.set('foo', 'bar');

    // @ts-ignore
    performance.now.mockReturnValue(60);
    expect(cache.get('foo')).toMatchObject({
      expired: false,
      item: 'bar',
    });

    // @ts-ignore
    performance.now.mockReturnValue(61);
    expect(cache.get('foo')).toMatchObject({
      expired: true,
      item: 'bar',
    });
  });

  test('Purge cache', () => {
    const cache = new TTLCache<string>(60);

    // @ts-ignore
    performance.now.mockReturnValue(0);
    cache.set('foo', 'bar');

    // @ts-ignore
    performance.now.mockReturnValue(10);
    cache.set('hello', 'world');

    // @ts-ignore
    performance.now.mockReturnValue(30);
    cache.set('nice', 'try');

    cache.purgeStale(71);

    expect(cache.get('foo')).toBeNull();
    expect(cache.get('hello')).toBeNull();
    expect(cache.get('nice')).not.toBeNull();
  });

  test('Purge cache on set', () => {
    const cache = new TTLCache<string>(60);

    // @ts-ignore
    performance.now.mockReturnValue(0);
    cache.set('foo', 'bar');

    // @ts-ignore
    performance.now.mockReturnValue(61);
    cache.set('hello', 'world');

    // @ts-ignore
    performance.now.mockReturnValue(80);
    expect(cache.get('foo')).toBeNull();

    // @ts-ignore
    performance.now.mockReturnValue(81);
    expect(cache.get('hello')).toMatchObject({
      expired: false,
      item: 'world',
    });

    // @ts-ignore
    performance.now.mockReturnValue(122);
    expect(cache.get('hello')).toMatchObject({
      expired: true,
      item: 'world',
    });
  });

  test('Custom TTL', () => {
    const cache = new TTLCache<string>(60);

    // @ts-ignore
    performance.now.mockReturnValue(0);
    cache.set('expire1', 'expire');
    cache.set('foo', 'bar', 80);
    cache.set('expire2', 'expire');

    // @ts-ignore
    performance.now.mockReturnValue(61);
    cache.set('hello', 'world');
    expect(cache.get('foo')).toMatchObject({
      expired: false,
      item: 'bar',
    });
    expect(cache.get('expire1')).toBeNull();
    expect(cache.get('expire2')).toBeNull();

    // @ts-ignore
    performance.now.mockReturnValue(81);
    expect(cache.get('foo')).toMatchObject({
      expired: true,
      item: 'bar',
    });
  });
});
