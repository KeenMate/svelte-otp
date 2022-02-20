<script>
	import OneTimePass from "./OneTimePass.svelte";
	import TextField from "./TextField.svelte"
	let value,onlyNumbers,chunks,chunkLength;
</script>

<main>

	<h1>Svelte otp test</h1>
	<p></p>
	<OneTimePass bind:value
  bind:onlyNumbers
  bind:chunks
  bind:chunkLength/>
</main>
onlyNumbers	<input type="checkbox" bind:checked={onlyNumbers}>
value: <input type="text" bind:value={value}>
chunks:	<input type="number" bind:value={chunks}>
chunkLength: <input type="number" bind:value={chunkLength}>