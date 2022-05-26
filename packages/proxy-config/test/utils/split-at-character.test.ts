import { splitAtCharacter } from '../../src/utils/split-at-character';

describe('Split at character', () => {
  test('Start at position', () => {
    const [part1, part2] = splitAtCharacter('/foo/bar/test', '/', 1);
    expect(part1).toBe('foo');
    expect(part2).toBe('bar/test');
  });

  test('Empty string', () => {
    const [part1, part2] = splitAtCharacter('', '/');
    expect(part1).toBe('');
    expect(part2).toBe('');
  });

  test('Missing second part', () => {
    const [part1, part2] = splitAtCharacter('hello/', '/');
    expect(part1).toBe('hello');
    expect(part2).toBe('');
  });
});
