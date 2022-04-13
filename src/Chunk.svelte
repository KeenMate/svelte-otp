<script>
	import {createEventDispatcher} from "svelte"

	export let inputElement = null

	export let value = ""
	export let title = ""
	export let placeholder = ""
	export let pattern = null
	export let type = "text"
	export let inputMode = "numeric"
	export let disabled = false
	export let containerClass = null
	export let maxLength = null

	const dispatch = createEventDispatcher()

	function onInput(ev) {
		dispatch("originalInput", ev)
		const targetValue = ev.target.value

		value = targetValue
		dispatch("input", targetValue)
	}
</script>

<div class="otp-field {containerClass || ''}" {title}>
	<input
		bind:this={inputElement}
		class=" {$$restProps.class || ''}"
		{value}
		{type}
		inputmode={inputMode}
		{placeholder}
		{pattern}
		{disabled}
		maxlength={maxLength}
		on:input={onInput}
		on:change
		on:beforeinput
		on:keydown
	/>
</div>

<style lang="sass">
	.otp-field
		width: calc(var(--chunk-width, 4em) + (1.5em - 2px))

		input
			text-align: center
			-moz-appearance: textfield

			&::-webkit-outer-spin-button,
			&::-webkit-inner-spin-button
				-webkit-appearance: none
				margin: 0
</style>
