<script>
  import { createEventDispatcher, tick } from "svelte";
  import TextField from "./TextField.svelte";
  const dispatch = createEventDispatcher();
  const Separator = '-';
  export let value;
  export let onlyNumbers = true;
  // Not reactive
  export let chunks = 3;
  export let chunkLength = 3;

  let pattern;
  $: pattern = createPattern(onlyNumbers,chunkLength)

  let chunkInputs = [];
  $: sanitizedValue = sanitizeValue(value);
  $: sanitizedValueWithSeparators = zipWithSeparators(sanitizedValue);
  $: chunksFilled = getChunksFilledCount(sanitizedValue);
  $: chunksFilledChanged(sanitizedValue);

  function createPattern(numbers,length) {
    console.log((numbers?  "[0-9]":".") + "{"+ length + "}")
    return (numbers?  "[0-9]":".") + "{"+ length + "}"
    }


  function zipWithSeparators(chunks) {
    return chunks.flatMap((c) => [Separator, c]).slice(1);
  }

  function sanitizeValue(value) {
    if (value && value instanceof Array && value.length === chunks)
      return value;
    if (typeof value === "string" && value.length) return getChunkValues(value);
    return getEmptyArray(chunks);
  }

  function getChunkValues(val) {

    const emptyChunks = getEmptyArray(chunks);
    const newChunks = val.match(new RegExp(`.{1,${chunkLength}}`, "g"));
    if (!newChunks) return emptyChunks;
    if (newChunks.length === chunks) return newChunks;
    return emptyChunks.map((x, i) => newChunks[i] || x);
  }

  function getEmptyArray(length) {
    return Array.from(new Array(length), () => "");
  }

  function chunksFilledChanged(val) {
    let index = val?.map((x) => x.length < chunkLength).findIndex((x) => x);
    //check if found
    if (index != -1) {
      tick().then(() => {
        chunkInputs[index]?.focus();
        moveCursor(chunkInputs[index], chunkInputs[index].value.length);
      });
    }
  }

  function getChunksFilledCount(val) {
    return (
      val?.reduce(
        (acc, x) => acc + ((x.length === chunkLength && 1) || 0),
        0
      ) || 0
    );
  }

  function beforeChunkChanged(ev, idx) {
    console.log(ev.data)
    let invalid = false;
    if (ev.data === null) {
      if (sanitizedValue[idx].length === 1)
        setTimeout(() => chunkInputs[idx - 1]?.focus(), 0);
      return;
    }

    if (!invalid && ev.data.length > 1) {
      // Probably pasting code
      // TODO prevent default instead of returning if it isnt right size
      //	ev.preventDefault();
      const numbers = ev.data.match(/\d/g);
      if (!numbers || numbers.length !== chunks * chunkLength) invalid = true;
      else {
        const numbersString = numbers.join("");
        value = getChunkValues(numbersString);
        dispatch("change", value);
      }
      // Skip further input events for this flow
      invalid = true;
    }
    console.log(ev.data)
    if(onlyNumbers){
      const parsed = parseInt(ev.data);
      if (isNaN(parsed)) invalid = true;
    }  
    if ((sanitizedValue[idx] + ev.data).length > chunkLength) {
      if (!invalid) {
        // Check if this is not last one
        if (chunkInputs[idx + 1]?.value.length < chunkLength) {
          chunkInputs[idx + 1].value = parsed + chunkInputs[idx + 1].value;
          tick().then(() => {
            chunkInputs[idx + 1]?.focus();
          });
        }
      }
      invalid = true;
    }
    if (invalid) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
    return !invalid;
  }

  function keystroke(ev, idx) {
    // 37: left 39: right
    console.log(ev);

    if (ev.keyCode == 39) {
      //only moves if you are on end of text
      if (
        chunkInputs[idx + 1] &&
        chunkInputs[idx].selectionStart == chunkInputs[idx].value.length
      ) {
        ev.preventDefault();
        tick().then(() => {
          chunkInputs[idx + 1]?.focus();
          moveCursor(chunkInputs[idx + 1], 0);
        });
      }
    }
    if (ev.keyCode == 37 || ev.keyCode == 8) {
      //only moves, if you are in the beginning and dont have any text selected
      if (
        chunkInputs[idx - 1] &&
        chunkInputs[idx].selectionStart == 0 &&
        chunkInputs[idx].selectionEnd == 0
      ) {
        ev.preventDefault();
        tick().then(() => {
          chunkInputs[idx - 1]?.focus();
          moveCursor(chunkInputs[idx - 1], chunkInputs[idx - 1].value.length);
        });
      }
    }
  }

  function chunkChanged(ev, idx) {
    console.log(ev.data)
    value = getUpdatedChunks(sanitizedValue, getValueFromEvent(ev), idx);
    dispatch("change", value);
  }

  function getUpdatedChunks(chunks, value, idx) {
    return chunks.map((x, i) => (i === idx ? value : x));
  }

  function getValueFromEvent(event) {
    if (event instanceof CustomEvent) {
      // manual event
      if (event.data === null) return event.substring(0, event.length - 1);
      // because this event is composed from previous chunk - thus preceding the original value
      else return event.detail + event.target.value;
    } else return event.target.value;
  }

  function getIndexWithoutSeparators(idx) {
    return idx / 2;
  }

  //TODO: stop disabling chunks / revork logic so it wont rely on chunkfilled instead check if it is last empty?
  function isDisabled(idx, chunksFilled) {
    return idx > chunksFilled && !chunkInputs[idx]?.value;
  }

  //this maybe doesnt work for old ie, not sure
  function moveCursor(el, pos) {
    if (el && el.setSelectionRange) {
      el.focus();
      el.setSelectionRange(pos, pos);
    }
  }
</script>

<div class="one-time-pass mb-4">
  {#each sanitizedValueWithSeparators as chunkValue, i}
    {#if chunkValue === Separator}
      <span class="separator">-</span>
    {:else}
      <TextField
        bind:inputElement={chunkInputs[getIndexWithoutSeparators(i)]}
        value={chunkValue}
        {pattern}
        disabled={isDisabled(getIndexWithoutSeparators(i), chunksFilled)}
        on:beforeinput={(ev) =>
          beforeChunkChanged(ev, getIndexWithoutSeparators(i))}
        on:originalInput={({ detail: ev }) =>
          chunkChanged(ev, getIndexWithoutSeparators(i))}
        on:keydown={(ev) => keystroke(ev, getIndexWithoutSeparators(i))}
      />
    {/if}
  {/each}
</div>

<style lang="sass">
	.one-time-pass
		display: flex
		gap: 1rem
		align-items: center
		:global
			.field
				margin-bottom: 0 !important
				width: 3.5rem
				input
					text-align: center
</style>
