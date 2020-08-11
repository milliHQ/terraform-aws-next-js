import { useRouter } from 'next/router';
import { format } from 'url';

import { Header } from '../components/header';

let counter = 0;

export async function getServerSideProps() {
  counter++;
  return { props: { initialPropsCounter: counter } };
}

export default function Index({ initialPropsCounter }) {
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

      <button onClick={reload}>Reload</button>
      <button onClick={incrementCounter}>Change State Counter</button>
      <p>"getServerSideProps" ran for "{initialPropsCounter}" times.</p>
      <p>Counter: "{query.counter || 0}".</p>
    </div>
  );
}
