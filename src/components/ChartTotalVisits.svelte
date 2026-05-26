<script lang="ts">
  interface Props {
    data: { date: string; total: number }[];
  }

  const { data = [] }: Props = $props();

  const W = 700;
  const H = 220;
  const PAD = { top: 15, right: 15, bottom: 25, left: 40 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  let hover = $state(-1);

  const maxVal = $derived(Math.max(...data.map((d) => d.total), 1));

  const pts = $derived(
    data.map((d, i) => ({
      x:
        PAD.left +
        (data.length > 1 ? (i / (data.length - 1)) * iW : iW / 2),
      y: PAD.top + iH - (d.total / maxVal) * iH,
      date: d.date,
      total: d.total,
    }))
  );

  const line = $derived(
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  );

  const area = $derived(
    pts.length > 1
      ? `${line} L${pts[pts.length - 1].x},${PAD.top + iH} L${pts[0].x},${PAD.top + iH} Z`
      : ""
  );

  const yTicks = $derived.by(() => {
    const count = maxVal < 4 ? maxVal + 1 : 5;
    const step = maxVal / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const val = Math.round((count - 1 - i) * step);
      return {
        val,
        y: PAD.top + (val === 0 ? iH : iH - (val / maxVal) * iH),
      };
    });
  });

  const xStep = $derived(Math.max(1, Math.floor(data.length / 6)));
</script>

{#if data.length > 0}
  <div class="chart-wrap">
    <svg viewBox="0 0 {W} {H}">
      {#each yTicks as tick, i (i)}
        <line
          x1={PAD.left}
          y1={tick.y}
          x2={W - PAD.right}
          y2={tick.y}
          stroke="var(--faded-line)"
          stroke-width="0.5"
        />
        <text
          x={PAD.left - 6}
          y={tick.y + 3}
          text-anchor="end"
          fill="var(--faded-text)"
          font-size="10">{tick.val}</text
        >
      {/each}

      {#if area}
        <path d={area} fill="var(--faded-bg)" />
      {/if}
      <path
        d={line}
        fill="none"
        stroke="var(--text)"
        stroke-width="1.5"
        stroke-linejoin="round"
      />

      {#each pts as p, i (p.date)}
        <rect
          x={p.x - iW / data.length / 2}
          y={PAD.top}
          width={iW / data.length}
          height={iH}
          fill="transparent"
          onmouseenter={() => (hover = i)}
          onmouseleave={() => (hover = -1)}
        />
        {#if hover === i}
          <line
            x1={p.x}
            y1={PAD.top}
            x2={p.x}
            y2={PAD.top + iH}
            stroke="var(--faded-line)"
            stroke-dasharray="3 3"
          />
          <circle cx={p.x} cy={p.y} r="3.5" fill="var(--text)" />
        {/if}
      {/each}

      {#each pts as p, i (p.date)}
        {#if i % xStep === 0 || i === data.length - 1}
          <text
            x={p.x}
            y={H - 5}
            text-anchor="middle"
            fill="var(--faded-text)"
            font-size="10">{p.date}</text
          >
        {/if}
      {/each}
    </svg>

    {#if hover >= 0}
      <div class="tip" style="left:{(pts[hover].x / W) * 100}%">
        <strong>{pts[hover].date}</strong>
        <span>{pts[hover].total} visits</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .chart-wrap {
    position: relative;
    width: 100%;
    margin: var(--gap) 0;
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: hidden;
  }
  .tip {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    background: var(--bg);
    border: 1px solid var(--faded-line);
    border-radius: var(--radius, 4px);
    padding: 4px 8px;
    font-size: 12px;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    white-space: nowrap;
  }
</style>
