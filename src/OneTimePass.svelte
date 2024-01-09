<script>
	import {createEventDispatcher, tick} from "svelte"
	import Chunk from "./Chunk.svelte"

	const dispatch = createEventDispatcher()
	//have to be only one char wide
	export let separator = "-"

	//value is array of values
	export let value

	export let joinedValue = ""
	export let onlyNumbers = false
	export let chunksCount = 3
	export let chunkLength = 3
	export let isComplete = false
	export let joinWithSeparators = false
	export let chunkType = "text"
	export let chunkInputMode = null

	//styles
	export let inputClass = "otp-default-input"
	export let inputContainerClass = "otp-default-field"
	export let containerClass = null
	export let separatorCLass = ""

	let rootElement

	let chunkInputs = []
	let moveToPreviousChunk = false

	$: updateValue(joinedValue)
	$: updateJoinedValue(value)
	$: rootElement?.style.setProperty("--chunk-width", chunkLength + "em")

	$: sanitizedValue = sanitizeValue(value, chunksCount, joinWithSeparators)
	$: sanitizedValueWithSeparators = zipWithSeparators(sanitizedValue, joinWithSeparators)
	$: chunksFilledCount = getChunksFilledCount(sanitizedValue)
	$: chunksFilledChanged(sanitizedValue)
	$: isComplete = calculateIsComplete(joinedValue, joinWithSeparators)

	function updateValue(joinedVal) {
		const val = splitVal(joinedVal)

		if (val === joinValue(value))
			return

		value = val
	}

	function updateJoinedValue(val) {
		const joined = joinValue(val)

		if (joined === joinedValue)
			return

		joinedValue = joined
	}

	function joinValue(val) {
		return joinWithSeparators
			? val?.join(separator) ?? ""
			: val?.join("") ?? ""
	}

	function splitVal(val) {
		return joinWithSeparators
			? val?.split(separator) ?? ""
			: val?.split("") ?? ""
	}

	//calculates isComplete based on length of value
	function calculateIsComplete(joinedValue, joinWithSeparators_) {
		let completeLength = (chunksCount * chunkLength) + (joinWithSeparators_ ? ((chunksCount - 1) * separator?.length) : 0)

		return joinedValue?.length === completeLength
	}

	//creates html pattern for inputs
	function createPattern(numbers, length) {
		return (numbers ? "[0-9]" : ".") + "{" + length + "}"
	}

	// creates separator chunks in between real chunks
	function zipWithSeparators(chunks, joinWithSeparators_) {
		if (!joinWithSeparators_)
			return chunks

		return chunks.flatMap((c) => [separator, c]).slice(1)
	}

	//return arrays with only real values
	function sanitizeValue(value) {
		if (value && value instanceof Array && value.length === chunksCount)
			return value
		if (typeof value === "string" && value.length) return getChunkValues(value)
		return getEmptyArray(chunksCount)
	}

	//creates array with only real values
	function getChunkValues(val) {
		const emptyChunks = getEmptyArray(chunksCount)
		const newChunks = val.match(new RegExp(`.{1,${chunkLength}}`, "g"))
		if (!newChunks)
			return emptyChunks
		if (newChunks.length === chunksCount)
			return newChunks

		return emptyChunks.map((x, i) => newChunks[i] ?? x)
	}

	function getEmptyArray(length) {
		return Array.from(new Array(length), () => "")
	}

	function chunksFilledChanged(val) {
		let firstChunkNotFilledIndex = val?.map(x => x.length < chunkLength).findIndex(x => x)
		//check if found
		if (firstChunkNotFilledIndex !== -1 && !moveToPreviousChunk) {
			setTimeout(() => {
				chunkInputs[firstChunkNotFilledIndex]?.focus()
			}, 0)
			// tick().then(() => {
			// 	//moveCursor(chunkInputs[index], chunkInputs[index].value.length);
			// })
		}
	}

	//calculates number of full chunks
	function getChunksFilledCount(val) {
		return (
			val?.reduce(
				(acc, x) => acc + ((x.length === chunkLength && 1) || 0),
				0
			) ?? 0
		)
	}

	function beforeChunkChanged(ev, idx) {
		let invalid = false
		if (ev.data === null) {
			if (chunkInputs[idx - 1] && sanitizedValue[idx].length <= 1)
				//moves cursor in next event
				moveToPreviousChunk = true
			return
		}

		if (!invalid && ev.data.length > 1) {
			// Probably pasting code
			// TODO prevent default instead of returning if it isnt right size
			// TODO pasting only work for numbers
			//	ev.preventDefault();
			const numbers = ev.data.match(/\d/g)
			if (!numbers ?? numbers.length !== chunksCount * chunkLength)
				invalid = true
			else {
				const numbersString = numbers.join("")
				value = getChunkValues(numbersString)
				dispatch("change", value)
			}
			// Skip further input events for this flow
			invalid = true
		}
		if (onlyNumbers) {
			const parsed = parseInt(ev.data)
			if (isNaN(parsed)) invalid = true
		}

		if ((sanitizedValue[idx] + ev.data).length > chunkLength) {
			if (!invalid) {
				if (chunkInputs[idx + 1] && chunkInputs[idx + 1].value.length < chunkLength) {
					chunkInputs[idx + 1].value = ev.data + chunkInputs[idx + 1].value
					tick().then(() => {
						// to update 'value' of this component
						chunkInputs[idx + 1].dispatchEvent(new InputEvent("input", {
							bubbles: true,
							cancelable: true
						}))
						chunkInputs[idx + 1].focus()
					})
				}
			}
			invalid = true
		}
		if (invalid) {
			ev.preventDefault()
			ev.stopImmediatePropagation()
		}
		return !invalid
	}

	//moving between chunks with arrows and backspace
	function keystroke(ev, idx) {
		if (ev.key === "ArrowRight" || ev.key === "Delete") {
			//only moves if you are on end of text
			if (
				chunkInputs[idx + 1] &&
				chunkInputs[idx].selectionStart == chunkInputs[idx].value.length
			) {
				ev.preventDefault()
				tick().then(() => {
					moveCursor(chunkInputs[idx + 1], 0)
				})
			}
		}
		if (ev.key === "ArrowLeft" || ev.key === "Backspace") {
			//only moves, if you are in the beginning and dont have any text selected
			if (
				chunkInputs[idx - 1] &&
				chunkInputs[idx].selectionStart == 0 &&
				chunkInputs[idx].selectionEnd == 0
			) {
				ev.preventDefault()
				tick().then(() => {
					moveCursor(chunkInputs[idx - 1], chunkInputs[idx - 1].value.length)
				})
			}
		}
	}

	function chunkChanged(ev, idx) {
		updateChunk(idx, getValueFromEvent(ev))

		if (moveToPreviousChunk) {
			tick().then(() => {
				moveCursor(chunkInputs[idx - 1], chunkInputs[idx - 1].value.length)
				moveToPreviousChunk = false
			})
		}

	}

	function updateChunk(idx, val) {
		value = getUpdatedChunks(sanitizedValue, val, idx)
		dispatch("change", value)
	}

	function getUpdatedChunks(chunks, value, idx) {
		return chunks.map((x, i) => (i === idx ? value : x))
	}

	function getValueFromEvent(event) {
		return event.target.value
	}

	//will disable only if its empty
	function isDisabled(idx, chunksFilled) {
		return idx > chunksFilled && !chunkInputs[idx]?.value
	}

	//this maybe doesnt work for old ie, not sure
	function moveCursor(el, pos) {
		if (el && el.setSelectionRange) {
			el.focus()
			el.setSelectionRange(pos, pos)
		}
	}

	function computeIndex(realIndex, joinWithSeparators_) {
		return joinWithSeparators_
			? realIndex / 2
			: realIndex
	}
</script>

<div bind:this={rootElement} class="one-time-pass {containerClass || ''}">
	{#each sanitizedValueWithSeparators as chunkValue, i}
		{#if joinWithSeparators && chunkValue === separator}
			<span class={separatorCLass}>{separator}</span>
		{:else}
			<Chunk
				bind:inputElement={chunkInputs[computeIndex(i, joinWithSeparators)]}
				value={chunkValue}
				pattern={createPattern(onlyNumbers, chunkLength)}
				disabled={isDisabled(computeIndex(i, joinWithSeparators), chunksFilledCount)}
				class={inputClass}
				containerClass={inputContainerClass}
				type={chunkType}
				inputMode={chunkInputMode}
				maxLength={chunkLength}
				on:beforeinput={(ev) => beforeChunkChanged(ev, computeIndex(i, joinWithSeparators))}
				on:originalInput={({ detail: ev }) => chunkChanged(ev, computeIndex(i, joinWithSeparators))}
				on:keydown={(ev) => keystroke(ev, computeIndex(i, joinWithSeparators))}
			/>
		{/if}
	{/each}
</div>

<style lang="scss">
	:global {
		.one-time-pass {
			display: flex;
			gap: 1rem;
			align-items: center;
			justify-content: center;

			.otp-field {
				margin-bottom: 0 !important;

				input {
					text-align: center;
				}
			}

			.otp-default-field {
				width: 3.5rem;

				.otp-default-input {
					width: 100%;
					padding: 8px 12px;
					margin: 8px 0;
					display: inline-block;
					border: 1px solid #ccc;
					border-radius: 4px;
					box-sizing: border-box;
				}
			}
		}
	}
</style>
