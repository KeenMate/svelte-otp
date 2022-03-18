<script>
	import { createEventDispatcher, tick } from "svelte";
	import Chunk from "./Chunk.svelte";
	const dispatch = createEventDispatcher();
	//have to be only one char wide
	export let separator = "-";

	//value is array of values
	export let value;

	export let joinedValue = "";
	export let onlyNumbers = false;
	export let chunksCount = 3;
	export let chunkLength = 3;
	export let IsComplete = false;
	export let joinWithSeparators = false;

	//styles
	export let inputClass = "otp-default-input";
	export let inputContainerClass = "otp-default-field";
	export let containerClass = "one-time-pass";
	export let separatorCLass = "";


	$: joinedValue =  joinWithSeparators ? value?.join(separator) ?? "" :value?.join("") ?? "" ;
	let chunkInputs = [];

	$: sanitizedValue = sanitizeValue(value, chunksCount);
	$: sanitizedValueWithSeparators = zipWithSeparators(sanitizedValue);
	$: ChunksFilledCount = getChunksFilledCount(sanitizedValue);
	$: chunksFilledChanged(sanitizedValue);

	$: IsComplete = calculateIsComplete(joinedValue);

	//calculates IsComplete based on length of value
function calculateIsComplete(joinedValue){

	let completeLength = chunksCount * (joinWithSeparators ?  chunkLength  + 1 :  chunkLength)
	//substruct 1 if they are separators ( one less separators then chunks)
	if(joinWithSeparators)
		completeLength--;
	return (joinedValue?.length ==  completeLength) ?? false;
}

//creates html pattern for inputs
	function createPattern(numbers, length) {
		return (numbers ? "[0-9]" : ".") + "{" + length + "}";
	}

	// creates separator chunks in between real chunks
	function zipWithSeparators(chunks, chunksCunt) {
		return chunks.flatMap((c) => [separator, c]).slice(1);
	}

	//return arrays with only real values
	function sanitizeValue(value) {
		if (value && value instanceof Array && value.length === chunksCount)
			return value;
		if (typeof value === "string" && value.length) return getChunkValues(value);
		return getEmptyArray(chunksCount);
	}

	//creates array with only real values
	function getChunkValues(val) {
		const emptyChunks = getEmptyArray(chunksCount);
		const newChunks = val.match(new RegExp(`.{1,${chunkLength}}`, "g"));
		if (!newChunks) return emptyChunks;
		if (newChunks.length === chunksCount) return newChunks;
		return emptyChunks.map((x, i) => newChunks[i] ?? x);
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
				//moveCursor(chunkInputs[index], chunkInputs[index].value.length);
			});
		}
	}

	//calculates number of full chunks
	function getChunksFilledCount(val) {
		return (
			val?.reduce(
				(acc, x) => acc + ((x.length === chunkLength && 1) || 0),
				0
			) ?? 0
		);
	}


	function beforeChunkChanged(ev, idx) {
		let invalid = false;
		if (ev.data === null) {
			if (sanitizedValue[idx].length === 1)
			//moves cursor in next tick
				setTimeout(() => {
				moveCursor(chunkInputs[idx - 1], chunkInputs[idx - 1].value.length);
				}, 0);
			return;
		}

		if (!invalid && ev.data.length > 1) {
			// Probably pasting code
			// TODO prevent default instead of returning if it isnt right size
			// TODO pasting only work for numbers
			//	ev.preventDefault();
			const numbers = ev.data.match(/\d/g);
			if (!numbers ?? numbers.length !== chunksCount * chunkLength)
				invalid = true;
			else {
				const numbersString = numbers.join("");
				value = getChunkValues(numbersString);
				dispatch("change", value);
			}
			// Skip further input events for this flow
			invalid = true;
		}
		if (onlyNumbers) {
			const parsed = parseInt(ev.data);
			if (isNaN(parsed)) invalid = true;
		}

		if ((sanitizedValue[idx] + ev.data).length > chunkLength) {
			if (!invalid) {
				// Check if this is not last one
				if (chunkInputs[idx + 1]?.value.length < chunkLength) {
					chunkInputs[idx + 1].value = ev.data + chunkInputs[idx + 1].value;
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

	//moving between chunks with arrows and backspace
	function keystroke(ev, idx) {
		// 37: left 39: right 46:delete

		if (ev.keyCode == 39||ev.keyCode == 46) {
			//only moves if you are on end of text
			if (
				chunkInputs[idx + 1] &&
				chunkInputs[idx].selectionStart == chunkInputs[idx].value.length
			) {
				ev.preventDefault();
				tick().then(() => {
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
					moveCursor(chunkInputs[idx - 1], chunkInputs[idx - 1].value.length);
				});
			}
		}
	}

	function chunkChanged(ev, idx) {
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


	//will disable only if its empty
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

<div class={containerClass}>
	{#each sanitizedValueWithSeparators as chunkValue, i}
		{#if chunkValue === separator}
			<span class={separatorCLass}>{separator}</span>
		{:else}
			<Chunk
				bind:inputElement={chunkInputs[i/2]}
				value={chunkValue}
				pattern={createPattern(onlyNumbers, chunkLength)}
				disabled={isDisabled(i/2, ChunksFilledCount)}
				class={inputClass}
				containerClass={inputContainerClass}
				on:beforeinput={(ev) =>
					beforeChunkChanged(ev, i/2)}
				on:originalInput={({ detail: ev }) =>
					chunkChanged(ev, i/2)}
				on:keydown={(ev) => keystroke(ev, i/2)}
			/>
		{/if}
	{/each}
</div>

<style lang="sass">
:global
	.one-time-pass
		display: flex
		gap: 1rem
		align-items: center
		justify-content: center
		.otp-field
			margin-bottom: 0 !important
			input
				text-align: center
		.otp-default-field
			width: 3.5rem
	.otp-default-input
		width: 100%
		padding: 8px 12px
		margin: 8px 0
		display: inline-block
		border: 1px solid #ccc
		border-radius: 4px
		box-sizing: border-box


</style>
