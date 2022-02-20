<script>
	import {createEventDispatcher} from "svelte"

	export let inputElement = null

	export let value = ""
	export let title = ""
	export let placeholder = ""
	export let pattern = null
	export let type = "text"
	export let disabled = false

	export function getInputElement() {
		return inputElement
	}

	const dispatch = createEventDispatcher()

	function onInput(ev) {
		dispatch("originalInput", ev)
		const targetValue = ev.target.value

		value = targetValue
		dispatch("input", targetValue)
	}
</script>

	<div
		class="field {$$restProps.containerClass || ''}"
		{title}
	>
			<input
				bind:this={inputElement}
				class="input {$$restProps.class || ''}"
				{value}
				{type}
				{placeholder}
				{pattern}
				{disabled}
				on:input={onInput}
				on:change
				on:beforeinput
				on:keydown
			/>
		</div>


<style lang="sass">
</style>