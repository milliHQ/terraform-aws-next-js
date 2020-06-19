import * as path from 'path';
import { glob } from '@vercel/build-utils';
import { normalizePage } from '@vercel/next';

interface BuildProps {
  nextBuildDirectory: string;
}

export const build = async ({ nextBuildDirectory }: BuildProps) => {
  const dynamicPages: string[] = [];

  const prerenderManifest = await getPrerenderManifest(nextBuildDirectory);
  const pagesDir = path.join(nextBuildDirectory, 'serverless', 'pages');

  const pages = await glob('**/*.js', pagesDir);
  const staticPageFiles = await glob('**/*.html', pagesDir);

  Object.keys(staticPageFiles).forEach((page: string) => {
    const pathname = page.replace(/\.html$/, '');
    const routeName = normalizePage(pathname);

    // Prerendered routes emit a `.html` file but should not be treated as a
    // static page.
    // Lazily prerendered routes have a fallback `.html` file on newer
    // Next.js versions so we need to also not treat it as a static page here.
    if (
      prerenderManifest.staticRoutes[routeName] ||
      prerenderManifest.fallbackRoutes[routeName]
    ) {
      return;
    }

    const staticRoute = path.join(entryDirectory, pathname);

    staticPages[staticRoute] = staticPageFiles[page];
    staticPages[staticRoute].contentType = htmlContentType;

    if (isDynamicRoute(pathname)) {
      dynamicPages.push(routeName);
      return;
    }
  });
};
