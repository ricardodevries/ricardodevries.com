<script>
  export let id;

  const fetchImage = (async () => {
    const response = await globalThis.fetch(
      "/api/views?" + new globalThis.URLSearchParams({ id })
    );

    return await response.json();
  })();
</script>

{#await fetchImage then data}
  <span>{data.count}</span>
{:catch}
  <span>1</span>
{/await}
