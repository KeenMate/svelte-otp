<script>
  import OneTimePass from "./OneTimePass.svelte";
  let value, onlyNumbers, chunksCount, chunkLength, valueWithSeparators;
</script>

<main>
  <h1>Svelte otp test</h1>
  <p />
  <OneTimePass
    bind:value
    bind:onlyNumbers
    bind:chunksCount
    {chunkLength}
    bind:valueWithSeparators
  />
</main>

<div >
  <h1>Options</h1>
  <div>
    onlyNumbers <input type="checkbox" bind:checked={onlyNumbers} />
  </div>
  <div>
    value: <input type="text" bind:value={valueWithSeparators} /> || {JSON.stringify(
      value
    )}
  </div>
  <div>chunks: <input type="number" bind:value={chunksCount} /></div>
  <div>chunkLength: <input type="number" bind:value={chunkLength} /></div>
	<br/>
  <b>+ styling props </b>
		<ul>
			<li>inputClass</li>
			<li>inputContainerClass</li>
			<li>containerClass</li>
			<li>separatorCLass</li>
		</ul>

</div>