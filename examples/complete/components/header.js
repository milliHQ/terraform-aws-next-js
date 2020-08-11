import * as React from 'react';
import Link from 'next/link';

export const Header = () => {
  return (
    <header>
      <nav>
        <Link href="/">
          <a>Home</a>
        </Link>
        <Link href="/test/[...slug]" as={`/test/a/b/c`}>
          <a>Slug Test</a>
        </Link>
        <Link href="/about">
          <a>About</a>
        </Link>
      </nav>
      <style jsx>{`
        nav {
          display: flex;
        }
        a {
          font-size: 14px;
          margin-right: 15px;
          text-decoration: none;
        }
        .is-active {
          text-decoration: underline;
        }
      `}</style>
    </header>
  );
};
