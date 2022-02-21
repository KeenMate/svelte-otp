﻿<script>
	import { createEventDispatcher, tick } from "svelte";
	import Chunk from "./Chunk.svelte";
	const dispatch = createEventDispatcher();
	export const Separator = "-";
	//value is array of values
	export let value;
	export let valueWithSeparators;
	export let onlyNumbers = true;
	export let chunksCount = 3;
	export let chunkLength = 3;

	//styles
	export let inputClass = "otp-default-input";
	export let inputContainerClass = "";
	export let containerClass = "one-time-pass";
	export let separatorCLass = "";

	$: valueWithSeparators = value?.join(Separator);
	let chunkInputs = [];

	$: sanitizedValue = sanitizeValue(value, chunksCount);
	$: sanitizedValueWithSeparators = zipWithSeparators(sanitizedValue);
	$: ChunksFilledCount = getChunksFilledCount(sanitizedValue);
	$: chunksFilledChanged(sanitizedValue);

	function createPattern(numbers, length) {
		return (numbers ? "[0-9]" : ".") + "{" + length + "}";
	}

	function zipWithSeparators(chunks, chunksCunt) {
		return chunks.flatMap((c) => [Separator, c]).slice(1);
	}

	function sanitizeValue(value) {
		if (value && value instanceof Array && value.length === chunksCount)
			return value;
		if (typeof value === "string" && value.length) return getChunkValues(value);
		return getEmptyArray(chunksCount);
	}

	function getChunkValues(val) {
		const emptyChunks = getEmptyArray(chunksCount);
		const newChunks = val.match(new RegExp(`.{1,${chunkLength}}`, "g"));
		if (!newChunks) return emptyChunks;
		if (newChunks.length === chunksCount) return newChunks;
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
			if (!numbers || numbers.length !== chunksCount * chunkLength)
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
		{#if chunkValue === Separator}
			<span class={separatorCLass}>-</span>
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
		:global
			.field
				margin-bottom: 0 !important
				width: 3.5rem
				input
					text-align: center
	.otp-default-input
		width: 100%
		padding: 8px 12px
		margin: 8px 0
		display: inline-block
		border: 1px solid #ccc
		border-radius: 4px
		box-sizing: border-box


</style>