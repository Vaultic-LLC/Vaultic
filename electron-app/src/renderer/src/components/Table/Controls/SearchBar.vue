<template>
	<div class="searchBarContainer" :class="{ active: active }">
		<input ref="input" required="false" class="seachBarInput" type="text" name="text" autocomplete="off"
			:value="modelValue.value" @input="onInput(($event.target as HTMLInputElement).value)" @focus="onFocus"
			@blur="onUnfocus" />
		<label class="searchBarLabel">Search</label>
		<div class="searchIcon" @click="onIconClick">
			<ion-icon name="search-outline"></ion-icon>
		</div>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../../Types/Colors"

export default defineComponent({
	name: "SearchBar",
	emits: ["update:modelValue"],
	props: ["modelValue", "color", "width", "labelBackground"],
	setup(props)
	{
		const input: Ref<HTMLElement | null> = ref(null);
		const computedWidth: ComputedRef<string> = computed(() => props.width ?? "300px");
		const modelValue: ComputedRef<Ref<string>> = computed(() => props.modelValue);
		const active: Ref<boolean> = ref(false);

		function onInput(value: string)
		{
			modelValue.value.value = value;
			if (value != '')
			{
				active.value = true;
			}
		}

		function onFocus()
		{
			active.value = true;
		}

		function onUnfocus()
		{
			if (modelValue.value.value == '')
			{
				active.value = false;
			}
		}

		function onIconClick()
		{
			if (input.value)
			{
				input.value.focus();
			}
		}

		return {
			input,
			defaultInputColor,
			defaultInputTextColor,
			computedWidth,
			active,
			onInput,
			onFocus,
			onUnfocus,
			onIconClick
		}
	}
})
</script>

<style scoped>
.searchBarContainer {
	position: relative;
	height: 50px;
	width: v-bind('computedWidth');
	border: 1.5px solid v-bind(color);
	border-radius: 2rem;
	transition: border 300ms cubic-bezier(0.4, 0, 0.2, 1), .3s;
}

.searchBarContainer .seachBarInput {
	position: absolute;
	border: 0;
	width: 80%;
	height: inherit;
	left: 20%;
	color: white;
	background: none;
	font-size: 1rem;
}

.searchBarContainer .searchBarLabel {
	position: absolute;
	left: 20%;
	top: 0;
	color: v-bind(defaultInputTextColor);
	pointer-events: none;
	transform: translateY(1rem);
	transition: var(--input-label-transition);
	background-color: #121218;
}

.searchBarContainer.active {
	outline: none;
	border: 1.5px solid v-bind(color);
}

.searchBarContainer .seachBarInput:focus,
.searchBarContainer .seachBarInput:valid {
	border: 0;
	outline: 0;
}

.searchBarContainer .seachBarInput:focus~label,
.searchBarContainer .seachBarInput:valid~label {
	transform: translateY(-80%) scale(0.8);
	background-color: #15151b;
	padding: 0 .2em;
	color: v-bind(color);
	left: 10px;
}

.searchBarContainer .searchIcon {
	position: absolute;
	font-size: 1.5rem;
	top: 50%;
	left: 5%;
	height: 50%;
	aspect-ratio: 1 /1;
	transform: translateY(-50%);
	color: v-bind(color);
	border-radius: 50%;
	/* border: 2px solid v-bind(color); */
	transition: 0.3s;
	display: flex;
	justify-content: center;
	align-items: center;
}

/* .searchBarContainer .searchIcon:hover {
	color: v-bind(color);
	box-shadow: 0 0 25px v-bind(color);
} */
</style>
