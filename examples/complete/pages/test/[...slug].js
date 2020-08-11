import { useRouter } from 'next/router';
import Link from 'next/link';
import { format } from 'url';

import { Header } from '../../components/header';

let counter = 0;

export async function getServerSideProps(ctx) {
  counter++;
  return {
    props: {
      params: ctx.params,
      query: ctx.query,
      slug: ctx.query && ctx.query.slug,
      initialPropsCounter: counter,
    },
  };
}

export default function Index({
  initialPropsCounter,
  slug,
  params,
  query: serverQuery,
}) {
  const router = useRouter();
  const { pathname, query } = router;

  const reload = () => {
    router.push(format({ pathname, query }));
  };
  const incrementCounter = () => {
    const currentCounter = query.counter ? parseInt(query.counter) : 0;
    const href = `/?counter=${currentCounter + 1}`;

    router.push(href, href, { shallow: true });
  };

  return (
    <div>
      <Header />

      <h2>This is the Home Page</h2>
      <Link href="/about">
        <a>About</a>
      </Link>
      <button onClick={reload}>Reload</button>
      <pre>Server: {JSON.stringify(slug)}</pre>
      <pre>Client: {JSON.stringify(query.slug)}</pre>

      <pre>Params: {JSON.stringify(params)}</pre>
      <pre>Query: {JSON.stringify(serverQuery)}</pre>
      <button onClick={incrementCounter}>Change State Counter</button>
      <p>"getServerSideProps" ran for "{initialPropsCounter}" times.</p>
      <p>Counter: "{query.counter || 0}".</p>
    </div>
  );
}
