<script>
  export let id;
  const fetchImage = (async () => {
    const response = await fetch("/api/views?" + new URLSearchParams({ id }));
    return await response.json();
  })();
</script>

{#await fetchImage then data}
  <span>{data.count}</span>
{:catch}
  <span>1</span>
{/await}
