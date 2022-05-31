/**
 * The Lambda routes is basically a string separated by " ".
 * First value is the route (key), second one is the endpoint (value), e.g.
 * "/__NEXT_PAGE_LAMBDA_0 https://xyz.execute-api.eu-central-1.amazonaws.com"
 */
function parseLambdaRoutes(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  const splittedInput = input.trim().split(' ');

  for (let index = 0; index < splittedInput.length; index = index + 2) {
    const key = splittedInput[index];
    const value = splittedInput[index + 1];

    if (key && value) {
      result[key] = value;
    }
  }

  return result;
}

export { parseLambdaRoutes };
