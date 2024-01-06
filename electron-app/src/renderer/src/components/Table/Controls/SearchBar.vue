<template>
	<div class="searchBarContainer">
		<input required="false" class="seachBarInput" type="text" name="text" autocomplete="off" :value="modelValue.value"
			@input="onInput(($event.target as HTMLInputElement).value)" />
		<label class="searchBarLabel">Search</label>
		<div class="searchIcon">
			<ion-icon name="search-outline"></ion-icon>
		</div>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../../Types/Colors"

export default defineComponent({
	name: "SearchBar",
	emits: ["update:modelValue"],
	props: ["modelValue", "color", "width"],
	setup(props)
	{
		const computedWidth: ComputedRef<string> = computed(() => props.width ?? "300px");
		const modelValue: ComputedRef<Ref<string>> = computed(() => props.modelValue);

		function onInput(value: string)
		{
			modelValue.value.value = value;
		}

		return {
			defaultInputColor,
			defaultInputTextColor,
			computedWidth,
			onInput
		}
	}
})
</script>

<style scoped>
.searchBarContainer {
	position: relative;
	height: 50px;
	width: v-bind('computedWidth');
	/* background: linear-gradient(145deg, #121a20, #0f161b);
    box-shadow: 5px 5px 10px #070a0c,
        -5px -5px 10px #1b2630;
        border-radius: 2rem; */
}

.searchBarContainer .seachBarInput {
	position: absolute;
	width: inherit;
	height: inherit;
	left: 0%;
	border: solid 1.5px v-bind(defaultInputColor);
	color: white;
	border-radius: 2rem;
	background: none;
	font-size: 1rem;
	transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.searchBarContainer .searchBarLabel {
	position: absolute;
	left: 10px;
	top: 0;
	color: v-bind(defaultInputTextColor);
	pointer-events: none;
	transform: translateY(1rem);
	transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.searchBarContainer .seachBarInput:focus,
.searchBarContainer .seachBarInput:valid {
	outline: none;
	border: 1.5px solid v-bind(color);
}

.searchBarContainer .seachBarInput:focus~label,
.searchBarContainer .seachBarInput:valid~label {
	transform: translateY(-80%) scale(0.8);
	background-color: var(--app-color);
	padding: 0 .2em;
	color: v-bind(color);
	left: 10px;
}

.searchBarContainer .searchIcon {
	position: absolute;
	font-size: 1.5rem;
	top: 50%;
	right: 5%;
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

.searchBarContainer .searchIcon:hover {
	color: v-bind(color);
	box-shadow: 0 0 25px v-bind(color);
}
</style>
