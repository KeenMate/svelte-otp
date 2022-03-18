<script>
  import OneTimePass from "../../src/OneTimePass.svelte";
  let value, onlyNumbers, chunksCount, chunkLength, joinedValue, completed,joinWithSeparators,separator;

</script>

<main>
  <h1>Svelte otp test</h1>
  <p />
  <OneTimePass
    bind:value
    bind:onlyNumbers
    bind:chunksCount
    {chunkLength}
    bind:joinedValue
		bind:IsComplete={completed}
	bind:separator

		{joinWithSeparators}
  />
</main>

<div>
  <h1>Options</h1>
  <div>
    onlyNumbers <input type="checkbox" bind:checked={onlyNumbers} />
  </div>
  <div>
    joinWithSeparators <input type="checkbox" bind:checked={joinWithSeparators} />
  </div>
  <div>
    value: <input type="text" bind:value={joinedValue} /> || {JSON.stringify(
      value
    )}
  </div>
  <div>chunks: <input type="number" bind:value={chunksCount} /></div>
  <div>chunkLength: <input type="number" bind:value={chunkLength} /></div>
  <div>separator(dont change it dynamicly)<input type="text" bind:value={separator} maxlength="1" readonly/></div>
	<div>IsComplete: {completed} </div>
  <br />
  <b>+ styling props </b>
  <ul>
    <li>inputClass</li>
    <li>inputContainerClass</li>
    <li>containerClass</li>
    <li>separatorCLass</li>
  </ul>

</div>
