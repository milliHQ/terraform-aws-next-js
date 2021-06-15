// Currently we need at least one SSR page for our e2e tests, so this is
// a dummy page

export async function getServerSideProps(ctx) {
  counter++;
  return {
    props: {
      params: ctx.params,
      query: ctx.query,
      slug: ctx.query && ctx.query.slug,
      initialPropsCounter: counter,
    },
  };
}

const ParamPage = (props) => {
  return (
    <div>
      <pre>{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
};

export default ParamPage;
