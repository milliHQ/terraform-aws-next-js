module.exports = {
  // Build the server for a serverless environment
  target: 'serverless',

  async rewrites() {
    return [
      {
        source: '/robots.txt',
        destination: '/api/robots',
      },
    ];
  },
};
