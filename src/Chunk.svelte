<script>
	import { createEventDispatcher } from "svelte";

	export let inputElement = null;

	export let value = "";
	export let title = "";
	export let placeholder = "";
	export let pattern = null;
	export let type = "text";
	export let disabled = false;

	const dispatch = createEventDispatcher();

	function onInput(ev) {
		dispatch("originalInput", ev);
		const targetValue = ev.target.value;

		value = targetValue;
		dispatch("input", targetValue);
	}
</script>

<div class="otp-field {$$restProps.containerClass || ''}" {title}>
	<input
		bind:this={inputElement}
		class=" {$$restProps.class || ''}"
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
