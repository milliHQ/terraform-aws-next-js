describe('export', () => {
  it('should require by path main', async () => {
    const main = require('@dealmore/tf-next-runtime');
    expect(main).toBeDefined();
  });

  it('should require by path dev-server relative to index', async () => {
    const index = require('@dealmore/tf-next-runtime/dist/index.js');
    const server = require('@dealmore/tf-next-runtime/dist/dev-server.js');
    expect(index).toBeDefined();
    expect(server).toBeDefined();
  });
});
