module.exports = {
  generateBuildId() {
    return 'testing-build-id';
  },

  async rewrites() {
    return [
      {
        source: '/sitemap/:type.xml',
        destination: '/api/sitemap/:type',
      },
    ];
  },
};
