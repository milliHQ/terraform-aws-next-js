module.exports = {
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
