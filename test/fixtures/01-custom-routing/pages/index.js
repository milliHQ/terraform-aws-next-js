import React from 'react';

// eslint-disable-next-line camelcase
export async function getStaticProps() {
  return {
    props: {
      world: 'world',
      path: process.cwd(),
    },
  };
}

export default ({ world, path }) => {
  const isSSR = path.startsWith('/var/task/');

  return (
    <>
      <p>hello: {world}</p>
      <p>isSSR: {JSON.stringify(isSSR)}</p>
    </>
  );
};
