const path = '/hello.txt';
const wildcard = 'some.domain';

const matcher = new RegExp(
  '^/(?!(?:_next/.*|en\\-US|nl\\-NL|nl\\-BE|nl|fr\\-BE|fr|en)(?:/.*|$))(.*)$'
);

const match = matcher.exec(path);

const keys = [...Object.keys([...match]), 'wildcard'];
const matches = [...match, wildcard];

console.log('match', Object.keys([...match]));
console.log({ keys, matches });
