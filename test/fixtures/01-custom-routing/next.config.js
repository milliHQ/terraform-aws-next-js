module.exports = {
  async rewrites() {
    return [
      // Rewriting to an external URL
      {
        source: '/docs/:slug',
        destination: 'http://example.com/docs/:slug',
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/redir1',
        destination: '/redir2',
        permanent: true,
      },
      {
        source: '/redir2',
        destination: '/hello',
        permanent: false,
      },
      {
        source: '/redir/:path',
        destination: '/:path',
        permanent: false,
      },
    ];
  },
};
