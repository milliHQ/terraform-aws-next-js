export default function Pdp({ product }) {
  return (
    <section>
      <h1>{product.name}</h1>
      <p>{product.productId}</p>
    </section>
  );
}

export async function getStaticProps(context) {
  const { params } = context;
  const { pid: productId } = params;
  const product = {
    productId,
    name: `${productId} Product Name`,
  };
  return {
    props: {
      product,
    }, // will be passed to the page component as props
  };
}

export async function getStaticPaths() {
  return {
    paths: [
      { params: { pid: 'one' } }, // See the "paths" section below
      { params: { pid: 'five' } }, // See the "paths" section below
      { params: { pid: 'beam' } }, // See the "paths" section below
    ],
    fallback: false,
  };
}
