import {
  createInvalidationChunk,
  prepareInvalidations,
} from '../src/create-invalidation';

describe('prepareInvalidations', () => {
  test('Collapse multiPaths', async () => {
    const invalidationPaths = ['a/b*', 'a*', 'c/d**', 'c*'];
    const [multiPaths, singlePaths] = prepareInvalidations(invalidationPaths);

    expect(singlePaths.length).toBe(0);
    expect(multiPaths).toEqual(['a*', 'c*']);
  });

  test('Remove single paths that are caught by multiPath', () => {
    const invalidationPaths = ['a*', 'aaa', 'bbb'];
    const [multiPaths, singlePaths] = prepareInvalidations(invalidationPaths);

    expect(singlePaths).toEqual(['bbb']);
    expect(multiPaths).toEqual(['a*']);
  });
});

describe('createInvalidationChunk', () => {
  const maxMultiPaths = 15;
  const maxTotalPaths = 3000;

  test('Full singlePaths', () => {
    const singlePaths = [...Array(maxTotalPaths).keys()].map(
      () => 'singlePath'
    );
    const multiPaths = [...Array(maxMultiPaths).keys()].map(() => 'multiPath');

    const [pathsChunk, newMultiPaths, newSinglePaths] = createInvalidationChunk(
      multiPaths,
      singlePaths,
      maxMultiPaths,
      maxTotalPaths
    );

    expect(pathsChunk.length).toBe(maxTotalPaths);
    expect(newSinglePaths.length).toBe(0);
    expect(newMultiPaths.length).toBe(maxMultiPaths);
  });

  test('Overfull singlePaths', () => {
    const overfillSinglePathsBy = 100;
    const singlePaths = [
      ...Array(maxTotalPaths + overfillSinglePathsBy).keys(),
    ].map(() => 'singlePath');
    const multiPaths = [...Array(maxMultiPaths).keys()].map(() => 'multiPath');

    const [pathsChunk, newMultiPaths, newSinglePaths] = createInvalidationChunk(
      multiPaths,
      singlePaths,
      maxMultiPaths,
      maxTotalPaths
    );

    expect(pathsChunk.length).toBe(maxTotalPaths);
    expect(newSinglePaths.length).toBe(overfillSinglePathsBy);
    expect(newMultiPaths.length).toBe(maxMultiPaths);
  });

  test('No singlePaths', () => {
    const overfillMultiPathsBy = 10;
    const singlePaths: string[] = [];
    const multiPaths = [
      ...Array(maxMultiPaths + overfillMultiPathsBy).keys(),
    ].map(() => 'multiPath');

    const [pathsChunk, newMultiPaths, newSinglePaths] = createInvalidationChunk(
      multiPaths,
      singlePaths,
      maxMultiPaths,
      maxTotalPaths
    );

    expect(pathsChunk.length).toBe(maxMultiPaths);
    expect(newSinglePaths.length).toBe(0);
    expect(newMultiPaths.length).toBe(overfillMultiPathsBy);
  });

  test('Fillup paths with multiPaths', () => {
    const allowedMultiPaths = 7;
    const singlePaths = [
      ...Array(maxTotalPaths - allowedMultiPaths).keys(),
    ].map(() => 'singlePath');
    const multiPaths = [...Array(maxMultiPaths).keys()].map(() => 'multiPath');

    const [pathsChunk, newMultiPaths, newSinglePaths] = createInvalidationChunk(
      multiPaths,
      singlePaths,
      maxMultiPaths,
      maxTotalPaths
    );

    expect(pathsChunk.length).toBe(maxTotalPaths);
    expect(newSinglePaths.length).toBe(0);
    expect(newMultiPaths.length).toBe(maxMultiPaths - allowedMultiPaths);
  });
});
