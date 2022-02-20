<script>
	import {createEventDispatcher} from "svelte"

	export let inputElement = null

	export let name = null
	export let label = ""
	export let value = ""
	export let title = ""
	export let placeholder = ""
	export let pattern = null
	export let type = "text"
	export let readonly = false
	export let required = false
	export let disabled = false
	export let addons = false
	export let isStatic = false
	export let isHorizontal = false
	export let color = ""
	export let error = null
	export let displayMandatoryNotice = false

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
		class="field {$$restProps.class || ''}"
		{title}
	>
		<div class="control input-control">
			<input
				bind:this={inputElement}
				class="input {(color && 'is-' + color) || ''}{error
					? ' is-danger'
					: ''}"
				class:is-static={isStatic}
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
		{#if error}
			<p class="help is-danger">
				{error}
			</p>
		{/if}
	</div>


<style lang="sass">
	.input 
		width: 100%
</style>