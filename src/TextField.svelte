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

{#if isHorizontal}
	<div class="field is-horizontal {$$restProps.class || ''}" {title}>
		<div class="field-label is-normal is-flex is-align-items-center pt-0">
			<label class="label">
				{label}
				{#if displayMandatoryNotice}
					{#if required}<span class="required-asterisk">*</span>{:else}<span
						class="optional-label">(optional)</span
					>{/if}
				{/if}
			</label>
		</div>
		<div class="field-body">
			<div class="field">
				<p class="control">
					<input
						bind:this={inputElement}
						class="input {(color && 'is-' + color) || ''}{error
							? ' is-danger'
							: ''}"
						class:is-static={isStatic}
						{name}
						{value}
						{type}
						{placeholder}
						{pattern}
						{readonly}
						{required}
						{disabled}
						on:input={onInput}
						on:change
						on:beforeinput
						on:blur
						on:keydown
					/>
				</p>
				{#if error}
					<p class="help is-danger">
						{error}
					</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	{#if addons}
		<div class="field label-field {$$restProps.class || ''}">
			<label class="label">
				{label}
				{#if displayMandatoryNotice}
					{#if required}<span class="required-asterisk">*</span>{:else}<span
						class="optional-label">(optional)</span
					>{/if}
				{/if}
			</label>
		</div>
	{/if}
	<div
		class="field {$$restProps.class || ''}"
		class:has-addons={addons}
		{title}
	>
		{#if !addons}
			<label class="label">
				{label}
			</label>
		{/if}
		{#if addons && $$slots.addonPrefix}
			<div class="control">
				<slot name="addonPrefix" />
			</div>
		{/if}
		<div class="control input-control">
			<input
				bind:this={inputElement}
				class="input {(color && 'is-' + color) || ''}{error
					? ' is-danger'
					: ''}"
				class:is-static={isStatic}
				{name}
				{value}
				{type}
				{placeholder}
				{pattern}
				{readonly}
				{required}
				{disabled}
				on:input={onInput}
				on:change
				on:beforeinput
				on:blur
				on:keydown
			/>
		</div>
		{#if error}
			<p class="help is-danger">
				{error}
			</p>
		{/if}
		{#if addons && $$slots.addonPostfix}
			<div class="control">
				<slot name="addonPostfix" />
			</div>
		{/if}
	</div>
{/if}


<style lang="sass">
	.required-asterisk
		color: red
	.label-field
		margin-bottom: 0 !important
		padding-bottom: .5rem !important
	.input-control
		flex: 1
	input.input
		&::placeholder
			font-weight: bold
		font-weight: bold
	.field.is-horizontal
		.field-label
			text-align: left !important
	.label:empty
		display: none
</style>