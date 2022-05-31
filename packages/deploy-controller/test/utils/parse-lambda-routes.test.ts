import { parseLambdaRoutes } from '../../src/utils/parse-lambda-routes';

describe('Parse Lambda routes', () => {
  test('Empty input', () => {
    const result = parseLambdaRoutes('');
    expect(result).toMatchObject({});
  });

  test('Multiple routes', () => {
    const input =
      '/__NEXT_PAGE_LAMBDA_0 https://abc.execute-api.eu-central-1.amazonaws.com ' +
      '/__NEXT_PAGE_LAMBDA_1 https://def.execute-api.eu-central-1.amazonaws.com';

    const result = parseLambdaRoutes(input);
    expect(result).toMatchObject({
      '/__NEXT_PAGE_LAMBDA_0':
        'https://abc.execute-api.eu-central-1.amazonaws.com',
      '/__NEXT_PAGE_LAMBDA_1':
        'https://def.execute-api.eu-central-1.amazonaws.com',
    });
  });
});
