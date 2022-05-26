import { reverseHostname } from '../../src/utils/reverse-hostname';

describe('Reverse hostname', () => {
  test('Unicode characters', () => {
    expect(reverseHostname('𝌆.bar.mañana.mañana.example.com')).toBe(
      'com.example.mañana.mañana.bar.𝌆'
    );
  });
});
