module.exports = {
  async rewrites() {
    return [
      {
        source: '/robots.txt',
        destination: '/api/robots',
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/blog/:slug*',
        destination: '/test/:slug*', // Matched parameters can be used in the destination
        permanent: true,
      },
    ];
  },
};
