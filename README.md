# svelte-otp (OneTimePassword)

Component for inputing one time passwords (commonly use to confirm sms). You can specify size a count of inputs.

## Functionality
  - specifying input size and count of separate inputs
  - change separator
  - automatically move to next checkbox if you write on delete
  - moving with arrows
  - add classes to every element

## Props
	-  separator(default: "-") 
	-  value(default: [])
  -  valueWithSeparators(default: "" )
  -  onlyNumbers(default: true)
	-  chunksCount(default: 3)
	-  chunkLength(default: 3)
	-  inputClass(default: "otp-default-input")
	-  inputContainerClass(default: "")
	-  containerClass(default: "one-time-pass")
	-  separatorCLass(default: "")


## Example

```
<script>
  import OneTimePass from "svelte-otp";
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

<div>
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
</div>

```