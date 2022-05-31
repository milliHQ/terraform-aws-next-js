import { performance } from 'perf_hooks';

import { fetchCached } from '../../src/actions/fetch-cached';
import { TTLCache } from '../../src/util/ttl-cache';
import { generateMockedFetchResponse } from '../test-utils';

type CacheEntry = {
  etag: string;
  value: string;
};

/* -----------------------------------------------------------------------------
 * Mocks
 * ---------------------------------------------------------------------------*/

jest.mock('perf_hooks', () => {
  return {
    performance: {
      now: jest.fn(() => Date.now()),
    },
  };
});

/* -----------------------------------------------------------------------------
 * Tests
 * ---------------------------------------------------------------------------*/

describe('Fetch cached', () => {
  test('Get item from empty cache', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(200, { value: 'bar' }, { etag: '"123"' })
      );
    const cache = new TTLCache<CacheEntry>(60);

    const result = await fetchCached(
      mockedFetch as any,
      cache,
      'http://localhost',
      'foo'
    );

    expect(result).toMatchObject({
      etag: '"123"',
      value: 'bar',
    });
    expect(mockedFetch).toBeCalledTimes(1);
  });

  test('Refetch expired item', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(200, { value: 'bar' }, { etag: '"123"' })
      );

    const cache = new TTLCache<CacheEntry>(60);
    jest.spyOn(cache, 'set');
    jest.spyOn(cache, 'updateTTL');

    let result: CacheEntry | null;

    // @ts-ignore
    performance.now.mockReturnValue(0);
    cache.set('foo', {
      etag: '"123"',
      value: 'bar',
    });

    // Cache not expired, no revalidation

    // @ts-ignore
    performance.now.mockReturnValue(60);
    result = await fetchCached(
      mockedFetch as any,
      cache,
      'http://localhost',
      'foo'
    );

    expect(result).toMatchObject({
      etag: '"123"',
      value: 'bar',
    });
    expect(mockedFetch).not.toBeCalled();

    // Stale local cache, revalidate with same remote content

    // @ts-ignore
    performance.now.mockReturnValue(61);
    mockedFetch.mockImplementation(() =>
      generateMockedFetchResponse(304, {}, { etag: '"123"' })
    );

    result = await fetchCached(
      mockedFetch as any,
      cache,
      'http://localhost',
      'foo'
    );
    expect(result).toMatchObject({
      etag: '"123"',
      value: 'bar',
    });
    // Set should not have been called, since same object
    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(cache.updateTTL).toHaveBeenCalledTimes(1);

    // Stale local cache, revalidate with changed content
    // @ts-ignore
    performance.now.mockReturnValue(122);
    mockedFetch.mockImplementation(() =>
      generateMockedFetchResponse(
        200,
        { value: 'updatedBar' },
        { etag: '"456"' }
      )
    );

    result = await fetchCached(
      mockedFetch as any,
      cache,
      'http://localhost',
      'foo'
    );
    expect(result).toMatchObject({
      etag: '"456"',
      value: 'updatedBar',
    });
    expect(cache.set).toHaveBeenCalledTimes(2);
  });
});
