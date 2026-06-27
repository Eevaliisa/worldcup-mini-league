<script>
  let { code = null, name = '' } = $props();
</script>

{#if code}
  <img
    class="flag"
    src={`https://flagcdn.com/w80/${code}.png`}
    srcset={`https://flagcdn.com/w160/${code}.png 2x`}
    alt={name ? `${name} flag` : ''}
    loading="lazy"
  />
{/if}

<style>
  .flag {
    display: inline-block;
    width: 1.45em;
    height: 0.97em;
    object-fit: cover;
    border-radius: 2px;
    vertical-align: -0.13em;
    box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.18);
  }
</style>
