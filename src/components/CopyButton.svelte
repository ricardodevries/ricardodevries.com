<script lang="ts">
  import { onDestroy } from "svelte";

  interface LegacyClipboardDocument extends Document {
    execCommand(commandId: string): boolean;
  }

  interface Props {
    ariaLabel?: string;
    fluid?: boolean;
    label?: string;
    text: string;
  }

  const {
    ariaLabel = "Copy to clipboard",
    fluid = false,
    label,
    text,
  }: Props = $props();

  let copied = $state(false);
  let resetTimer: ReturnType<typeof window.setTimeout> | undefined;

  function clearResetTimer() {
    if (resetTimer) {
      window.clearTimeout(resetTimer);
      resetTimer = undefined;
    }
  }

  function resetCopied() {
    copied = false;
    clearResetTimer();
  }

  function copyWithSelection(value: string) {
    const pre = document.createElement("pre");
    Object.assign(pre.style, {
      height: "20px",
      left: "0",
      opacity: "0",
      overflow: "hidden",
      pointerEvents: "none",
      position: "absolute",
      top: "0",
      userSelect: "all",
      webkitUserSelect: "auto",
      width: "20px",
    });
    pre.ariaHidden = "true";
    pre.textContent = value;

    document.body.appendChild(pre);

    try {
      const range = document.createRange();
      range.selectNode(pre);

      const selection = window.getSelection();

      if (!selection) {
        return false;
      }

      selection.removeAllRanges();
      selection.addRange(range);

      try {
        return (document as LegacyClipboardDocument).execCommand("copy");
      } catch {
        return false;
      }
    } finally {
      window.getSelection()?.removeAllRanges();
      pre.remove();
    }
  }

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      if (!copyWithSelection(text)) {
        console.error("Could not copy text:", err);

        return;
      }
    }

    clearResetTimer();
    copied = true;
    resetTimer = window.setTimeout(resetCopied, 1500);
  }

  onDestroy(clearResetTimer);
</script>

<button
  aria-label={ariaLabel}
  class="copy-btn"
  class:copied
  class:fluid
  type="button"
  onblur={resetCopied}
  onclick={handleClick}
>
  {#if label}
    <span class="btn-text">{label}</span>
  {/if}

  {#if fluid}
    <span class="icon-holder">
      <span data-id="copy-icon" class="btn-holder btn-icon-copy">
        <svg
          aria-hidden="true"
          fill="none"
          height="16"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      </span>

      <span data-id="check-icon" class="btn-holder btn-icon-check">
        <svg
          aria-hidden="true"
          fill="none"
          height="16"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    </span>
  {:else}
    <span data-id="copy-icon" class="btn-holder btn-icon-copy">
      <svg
        aria-hidden="true"
        fill="none"
        height="16"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    </span>

    <span data-id="check-icon" class="btn-holder btn-icon-check">
      <svg
        aria-hidden="true"
        fill="none"
        height="16"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  {/if}
</button>
