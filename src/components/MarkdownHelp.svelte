<script lang="ts">
  interface Props {
    id: string;
  }

  const { id }: Props = $props();

  let open = $state(false);
</script>

<div class="markdown-help">
  <button
    aria-controls={id}
    aria-expanded={open}
    class="markdown-help-trigger"
    type="button"
    onclick={() => {
      open = !open;
    }}
  >
    Markdown help
  </button>

  {#if open}
    <div
      aria-label="Markdown formatting"
      class="markdown-help-popover"
      id={id}
      role="dialog"
    >
      <div class="markdown-help-examples">
        <div class="markdown-help-row">
          <code>**bold**</code>
          <span><strong>bold</strong></span>
        </div>
        <div class="markdown-help-row">
          <code>_italic_</code>
          <span><em>italic</em></span>
        </div>
        <div class="markdown-help-row">
          <code>`code`</code>
          <span><code>code</code></span>
        </div>
        <div class="markdown-help-row">
          <code>[link](https://example.com)</code>
          <span>link</span>
        </div>
        <div class="markdown-help-row">
          <code>&gt; quote</code>
          <span>quote</span>
        </div>
        <div class="markdown-help-row">
          <code>- list item</code>
          <span>list</span>
        </div>
        <div class="markdown-help-row">
          <code>```js</code>
          <span>code block</span>
        </div>
      </div>
      <p>Raw HTML, images, and checkboxes are ignored.</p>
      <button
        class="markdown-help-close"
        type="button"
        onclick={() => {
          open = false;
        }}
      >
        Close
      </button>
    </div>
  {/if}
</div>
