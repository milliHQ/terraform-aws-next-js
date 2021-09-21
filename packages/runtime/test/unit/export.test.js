describe('export', () => {
  it('should require by path main', async () => {
    const main = require('@millihq/tf-next-runtime');
    expect(main).toBeDefined();
  });

  it('should require by path dev-server relative to index', async () => {
    const index = require('@millihq/tf-next-runtime/dist/index.js');
    const server = require('@millihq/tf-next-runtime/dist/dev-server.js');
    expect(index).toBeDefined();
    expect(server).toBeDefined();
  });
});
