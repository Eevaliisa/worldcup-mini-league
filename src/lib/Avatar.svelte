<script module>
  export const AVATAR_KEYS = [
    'fox', 'cat', 'panda', 'owl', 'frog', 'bear', 'rabbit', 'lion', 'pig',
    'dog', 'koala', 'tiger', 'chick', 'fish', 'octopus', 'unicorn', 'crab', 'monkey'
  ];
</script>

<script>
  let { name = 'fox', size = 48, label = null } = $props();

  const animals = {
    fox: '<path d="M18 26 20 8 32 20Z" fill="#d9722a"/><path d="M46 26 44 8 32 20Z" fill="#d9722a"/><path d="M21 23 22 13 29 20Z" fill="#f7d0a8"/><path d="M43 23 42 13 35 20Z" fill="#f7d0a8"/><circle cx="32" cy="34" r="17" fill="#ed8a3f"/><path d="M32 32 C23 33 23 45 32 47 C41 45 41 33 32 32 Z" fill="#fff"/><circle cx="25" cy="31" r="2.6" fill="#2b2b33"/><circle cx="39" cy="31" r="2.6" fill="#2b2b33"/><path d="M32 41 29.5 38 34.5 38Z" fill="#2b2b33"/>',
    cat: '<path d="M19 25 18 9 31 20Z" fill="#7f8590"/><path d="M45 25 46 9 33 20Z" fill="#7f8590"/><path d="M22 22 21 13 28 20Z" fill="#e79bb0"/><path d="M42 22 43 13 36 20Z" fill="#e79bb0"/><circle cx="32" cy="35" r="17" fill="#9097a1"/><path d="M26 38 L8 35M26 41 L8 43M38 38 L56 35M38 41 L56 43" stroke="#dfe3ea" stroke-width="1.2" stroke-linecap="round"/><circle cx="25" cy="33" r="2.6" fill="#2b2b33"/><circle cx="39" cy="33" r="2.6" fill="#2b2b33"/><path d="M32 40 30.3 38 33.7 38Z" fill="#e79bb0"/><path d="M28 46 Q32 42 36 46" stroke="#2b2b33" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    panda: '<circle cx="20" cy="20" r="7" fill="#2b2b33" stroke="#5a5a68" stroke-width="1.6"/><circle cx="44" cy="20" r="7" fill="#2b2b33" stroke="#5a5a68" stroke-width="1.6"/><circle cx="32" cy="35" r="17" fill="#f4f4f6"/><ellipse cx="25" cy="33" rx="4.5" ry="6" fill="#2b2b33"/><ellipse cx="39" cy="33" rx="4.5" ry="6" fill="#2b2b33"/><circle cx="25" cy="33" r="1.8" fill="#fff"/><circle cx="39" cy="33" r="1.8" fill="#fff"/><circle cx="32" cy="40" r="2.4" fill="#2b2b33"/>',
    owl: '<path d="M16 18 22 26 18 30Z" fill="#7a5230"/><path d="M48 18 42 26 46 30Z" fill="#7a5230"/><circle cx="32" cy="34" r="17" fill="#a9794c"/><circle cx="25" cy="31" r="7" fill="#f4ead8"/><circle cx="39" cy="31" r="7" fill="#f4ead8"/><circle cx="25" cy="31" r="3" fill="#2b2b33"/><circle cx="39" cy="31" r="3" fill="#2b2b33"/><path d="M32 36 28 41h8Z" fill="#f0a23f"/><path d="M24 45c3 3 13 3 16 0" stroke="#7a5230" stroke-width="2" fill="none"/>',
    frog: '<circle cx="22" cy="20" r="7.5" fill="#7bd06a"/><circle cx="42" cy="20" r="7.5" fill="#7bd06a"/><circle cx="22" cy="19" r="3" fill="#2b2b33"/><circle cx="42" cy="19" r="3" fill="#2b2b33"/><path d="M15 32a17 17 0 0 0 34 0Z" fill="#6cbf5b"/><circle cx="32" cy="33" r="14" fill="#6cbf5b"/><path d="M23 38c5 5 13 5 18 0" stroke="#33632b" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
    bear: '<circle cx="19" cy="20" r="7" fill="#8a5d3b"/><circle cx="45" cy="20" r="7" fill="#8a5d3b"/><circle cx="19" cy="20" r="3.2" fill="#b07f57"/><circle cx="45" cy="20" r="3.2" fill="#b07f57"/><circle cx="32" cy="35" r="17" fill="#9b6b43"/><ellipse cx="32" cy="40" rx="9" ry="7" fill="#d8b48c"/><circle cx="25" cy="32" r="2.4" fill="#2b2b33"/><circle cx="39" cy="32" r="2.4" fill="#2b2b33"/><circle cx="32" cy="38" r="2.6" fill="#2b2b33"/>',
    rabbit: '<ellipse cx="25" cy="14" rx="4.5" ry="13" fill="#e7e1ec"/><ellipse cx="39" cy="14" rx="4.5" ry="13" fill="#e7e1ec"/><ellipse cx="25" cy="14" rx="2" ry="9" fill="#e79bb0"/><ellipse cx="39" cy="14" rx="2" ry="9" fill="#e79bb0"/><circle cx="32" cy="37" r="16" fill="#eee9f2"/><circle cx="26" cy="35" r="2.4" fill="#2b2b33"/><circle cx="38" cy="35" r="2.4" fill="#2b2b33"/><path d="M32 41 30 39h4Z" fill="#e79bb0"/>',
    lion: '<circle cx="19" cy="18" r="5" fill="#c9802f"/><circle cx="45" cy="18" r="5" fill="#c9802f"/><circle cx="19" cy="18" r="2.3" fill="#e89a3c"/><circle cx="45" cy="18" r="2.3" fill="#e89a3c"/><circle cx="32" cy="34" r="20" fill="#c9802f"/><circle cx="32" cy="34" r="14.5" fill="#f0b84e"/><circle cx="26" cy="32" r="2.5" fill="#2b2b33"/><circle cx="38" cy="32" r="2.5" fill="#2b2b33"/><path d="M32 39 29 36 35 36Z" fill="#6b3f15"/><path d="M25 42c4 3 10 3 14 0" stroke="#6b3f15" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    pig: '<path d="M20 22 17 11 31 20Z" fill="#e98fb0"/><path d="M44 22 47 11 33 20Z" fill="#e98fb0"/><circle cx="32" cy="35" r="17" fill="#f4a9c4"/><circle cx="26" cy="31" r="2.4" fill="#2b2b33"/><circle cx="38" cy="31" r="2.4" fill="#2b2b33"/><ellipse cx="32" cy="40" rx="7.5" ry="5.5" fill="#ec90b3"/><ellipse cx="29.5" cy="40" rx="1.2" ry="1.8" fill="#7a3a52"/><ellipse cx="34.5" cy="40" rx="1.2" ry="1.8" fill="#7a3a52"/>',
    dog: '<path d="M16 22c-4 2-5 12-2 18l8-6Z" fill="#8a5f38"/><path d="M48 22c4 2 5 12 2 18l-8-6Z" fill="#8a5f38"/><circle cx="32" cy="34" r="17" fill="#c79a6a"/><ellipse cx="32" cy="40" rx="8" ry="6" fill="#efe0cb"/><circle cx="25" cy="32" r="2.5" fill="#2b2b33"/><circle cx="39" cy="32" r="2.5" fill="#2b2b33"/><circle cx="32" cy="38" r="2.6" fill="#2b2b33"/>',
    koala: '<circle cx="18" cy="26" r="9" fill="#9aa3ad"/><circle cx="46" cy="26" r="9" fill="#9aa3ad"/><circle cx="18" cy="26" r="4.5" fill="#c2cad2"/><circle cx="46" cy="26" r="4.5" fill="#c2cad2"/><circle cx="32" cy="35" r="16" fill="#9aa3ad"/><circle cx="26" cy="33" r="2.4" fill="#2b2b33"/><circle cx="38" cy="33" r="2.4" fill="#2b2b33"/><ellipse cx="32" cy="40" rx="4.5" ry="6" fill="#4a4f57"/>',
    tiger: '<circle cx="22" cy="21" r="6" fill="#ef9038"/><circle cx="42" cy="21" r="6" fill="#ef9038"/><circle cx="22" cy="21" r="2.6" fill="#fbe6cf"/><circle cx="42" cy="21" r="2.6" fill="#fbe6cf"/><circle cx="32" cy="35" r="17" fill="#f0933f"/><ellipse cx="32" cy="40" rx="8" ry="6" fill="#fbe6cf"/><path d="M25 23v6M32 21v6M39 23v6M17 34h5M47 34h-5" stroke="#3a2412" stroke-width="2" stroke-linecap="round"/><circle cx="25" cy="33" r="2.4" fill="#2b2b33"/><circle cx="39" cy="33" r="2.4" fill="#2b2b33"/><circle cx="32" cy="38" r="2.4" fill="#2b2b33"/>',
    chick: '<path d="M32 19 30 12M32 19 34 12M32 19 32 11" stroke="#e8b400" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="35" r="16" fill="#f5d23f"/><circle cx="26" cy="32" r="2.5" fill="#2b2b33"/><circle cx="38" cy="32" r="2.5" fill="#2b2b33"/><path d="M32 37 28 40 32 43 36 40Z" fill="#f0922f"/><circle cx="24" cy="39" r="2" fill="#f0a98a"/><circle cx="40" cy="39" r="2" fill="#f0a98a"/>',
    fish: '<path d="M17 33 6 24 10 33 6 42Z" fill="#2f8fbf"/><ellipse cx="33" cy="33" rx="17" ry="12" fill="#3fa7d6"/><path d="M29 21 35 14 38 23Z" fill="#2f8fbf"/><path d="M30 45 34 51 37 44Z" fill="#2f8fbf"/><path d="M38 23 Q35 33 38 43" stroke="#2f8fbf" stroke-width="1.4" fill="none"/><circle cx="44" cy="30" r="3.4" fill="#fff"/><circle cx="45" cy="30" r="1.8" fill="#2b2b33"/><path d="M49 30.5 q4 2.5 0 5" stroke="#2f8fbf" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    octopus: '<ellipse cx="21" cy="44" rx="3.2" ry="8" fill="#8a66c8"/><ellipse cx="26.5" cy="45" rx="3.2" ry="8" fill="#8a66c8"/><ellipse cx="32" cy="45" rx="3.2" ry="8" fill="#8a66c8"/><ellipse cx="37.5" cy="45" rx="3.2" ry="8" fill="#8a66c8"/><ellipse cx="43" cy="44" rx="3.2" ry="8" fill="#8a66c8"/><circle cx="32" cy="30" r="14" fill="#9d7ad6"/><circle cx="27" cy="29" r="3.2" fill="#fff"/><circle cx="37" cy="29" r="3.2" fill="#fff"/><circle cx="27" cy="29" r="1.7" fill="#2b2b33"/><circle cx="37" cy="29" r="1.7" fill="#2b2b33"/><path d="M28 35q4 3 8 0" stroke="#6f4fb0" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    unicorn: '<path d="M32 5 29 22 35 22Z" fill="#f5c518"/><path d="M30 16h4M30.7 13h2.6M31.3 10h1.4" stroke="#d9ab12" stroke-width="1" stroke-linecap="round"/><path d="M22 24 19 11 30 21Z" fill="#efe6f7"/><path d="M42 24 45 11 34 21Z" fill="#efe6f7"/><path d="M24 22 22 14 28 21Z" fill="#d9b8e8"/><path d="M40 22 42 14 36 21Z" fill="#d9b8e8"/><circle cx="32" cy="36" r="16" fill="#efe6f7"/><path d="M44 24q7 6 3 14q-2 -5 -6 -5Z" fill="#b58fd6"/><circle cx="24" cy="40" r="2" fill="#f3b6cf"/><circle cx="40" cy="40" r="2" fill="#f3b6cf"/><circle cx="26" cy="35" r="2.4" fill="#2b2b33"/><circle cx="38" cy="35" r="2.4" fill="#2b2b33"/><path d="M26 41 Q32 49 38 41" stroke="#ec6fa6" stroke-width="2" fill="none" stroke-linecap="round"/>',
    crab: '<path d="M26 25v-8" stroke="#c43d33" stroke-width="2" stroke-linecap="round"/><path d="M38 25v-8" stroke="#c43d33" stroke-width="2" stroke-linecap="round"/><circle cx="26" cy="13" r="3.4" fill="#fff"/><circle cx="38" cy="13" r="3.4" fill="#fff"/><circle cx="26" cy="13" r="1.7" fill="#2b2b33"/><circle cx="38" cy="13" r="1.7" fill="#2b2b33"/><circle cx="11" cy="37" r="6" fill="#d34a40"/><circle cx="8" cy="33" r="3.2" fill="#1e1e2a"/><circle cx="53" cy="37" r="6" fill="#d34a40"/><circle cx="56" cy="33" r="3.2" fill="#1e1e2a"/><ellipse cx="32" cy="37" rx="15" ry="11.5" fill="#e2574b"/><path d="M26 38 q6 5 12 0" stroke="#a8362d" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    monkey: '<circle cx="14" cy="33" r="6" fill="#8a5a3c"/><circle cx="50" cy="33" r="6" fill="#8a5a3c"/><circle cx="14" cy="33" r="3" fill="#c98f63"/><circle cx="50" cy="33" r="3" fill="#c98f63"/><circle cx="32" cy="34" r="16" fill="#a86b43"/><ellipse cx="32" cy="39" rx="10.5" ry="8.5" fill="#e3c19a"/><circle cx="27" cy="31" r="2.4" fill="#2b2b33"/><circle cx="37" cy="31" r="2.4" fill="#2b2b33"/><ellipse cx="29.5" cy="39" rx="1" ry="1.4" fill="#7a4a2a"/><ellipse cx="34.5" cy="39" rx="1" ry="1.4" fill="#7a4a2a"/><path d="M28 43 q4 3 8 0" stroke="#7a4a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
  };

  let markup = $derived(animals[name] ?? animals.fox);
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 64 64"
  class="avatar"
  role={label ? 'img' : 'presentation'}
  aria-label={label}
  aria-hidden={label ? null : 'true'}
>
  <circle cx="32" cy="32" r="32" fill="#1e1e2a" />
  {@html markup}
</svg>

<style>
  .avatar { display: block; border-radius: 50%; }
</style>
