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
    bind:chunkLength
    bind:joinedValue
		bind:IsComplete={completed}
	bind:separator

		{joinWithSeparators}
  />
</main>

<div>
  <h1>Options</h1>
  <div>
    <label>onlyNumbers</label> <input type="checkbox" bind:checked={onlyNumbers} />
  </div>
  <div>
    <label>joinWithSeparators</label> <input type="checkbox" bind:checked={joinWithSeparators} />
  </div>
  <div>
    <label>joinedValue:</label> <input type="text" bind:value={joinedValue} />
  </div>
  <div>
    <label>Value:</label>  {JSON.stringify(value)}
  </div>
  <div> <label>chunks:</label> <input type="number" bind:value={chunksCount} /></div>
  <div> <label>chunkLength: </label><input type="number" bind:value={chunkLength} /></div>
  <div> <label>separator </label><input type="text" bind:value={separator} maxlength="1" readonly/></div>
	<div> <label>IsComplete:</label> {completed} </div>
  <br />
  <b>+ styling props </b>
  <ul>
    <li>inputClass</li>
    <li>inputContainerClass</li>
    <li>containerClass</li>
    <li>separatorCLass</li>
  </ul>

</div>

<style>
	div label{
		min-width: 10em;
		display: inline-block;
	}
</style>