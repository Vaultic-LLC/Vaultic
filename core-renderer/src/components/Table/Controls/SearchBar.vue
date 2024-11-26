<template>
	<div class="searchBarContainer">
		<!-- <input ref="input" required="false" class="seachBarInput" type="text" name="text" autocomplete="off"
			:value="modelValue.value" @input="onInput(($event.target as HTMLInputElement).value)" @focus="onFocus"
			@blur="onUnfocus" />
		<label class="searchBarLabel">Search</label>
		<div class="searchIcon" @click="onIconClick">
			<ion-icon name="search-outline"></ion-icon>
		</div> -->
        <FloatLabel variant="in" :dt="floatLabelStyle">
            <IconField>
                <!-- <div class="searchIcon">
                    <ion-icon name="search-outline"></ion-icon>
                </div>            -->
                <InputIcon class="pi pi-search" />
                <InputText :dt="inputStyle" :id="id" v-model="placeholderValue" :fluid="true" autocomplete="off" @update:model-value="onInput" />
            </IconField>
            <label :for="id">Search</label>
        </FloatLabel>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, useId } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../../Types/Colors"
import { widgetBackgroundHexString } from '../../../Constants/Colors';

import FloatLabel from "primevue/floatlabel";
import InputText from 'primevue/inputtext';
import InputIcon from 'primevue/inputicon';
import IconField from 'primevue/iconfield';

export default defineComponent({
	name: "SearchBar",
    components: 
    {
        FloatLabel,
        InputText,
        InputIcon,
        IconField
    },
	emits: ["update:modelValue"],
	props: ["modelValue", "color", 'height', 'minHeight', "width", 'minWidth', 'maxWidth', "labelBackground"],
	setup(props)
	{
        const id = ref(useId());

		const computedWidth: ComputedRef<string> = computed(() => props.width ?? "300px");
		const computedHeight: ComputedRef<string> = computed(() => props.height ?? '4vh');
		const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? '30px');

        const modelValue: ComputedRef<Ref<string>> = computed(() => props.modelValue);
        const placeholderValue: Ref<string> = ref(modelValue.value.value);

        let floatLabelStyle = computed(() => {
            return {
                onActive: {
                    background: widgetBackgroundHexString()
                },
                focus: 
                {
                    color: props.color,
                }
            }
        });

        let inputStyle = computed(() => {
            return {
                focus: 
                {
                    borderColor: props.color
                },
                background: widgetBackgroundHexString()
            }
        });

		function onInput(value: string | undefined)
		{
			modelValue.value.value = value ?? '';
		}

		return {
            id,
            placeholderValue,
			defaultInputColor,
			defaultInputTextColor,
			computedWidth,
			computedHeight,
			computedMinHeight,
            floatLabelStyle,
            inputStyle,
			onInput
		}
	}
})
</script>

<style scoped>
.searchBarContainer {
	position: relative;
	height: v-bind(computedHeight);
	min-height: v-bind(computedMinHeight);
	max-height: 50px;
	width: v-bind('computedWidth');
	min-width: v-bind('minWidth');
	max-width: v-bind('maxWidth');
	/* border: 1.5px solid v-bind(color);
	border-radius: 2rem;
	transition: border 300ms cubic-bezier(0.4, 0, 0.2, 1), .3s; */
}

/* .searchBarContainer .seachBarInput {
	position: absolute;
	top: 50%;
	transform: translate(0.1vw, -50%);
	border: 0;
	width: 80%;
	height: inherit;
	left: 20%;
	color: white;
	background: none;
	font-size: clamp(11px, 1.2vh, 25px);
}

.searchBarContainer .searchBarLabel {
	position: absolute;
	left: 20%;
	top: 50%;
	color: v-bind(defaultInputTextColor);
	pointer-events: none;
	transform: translate(5px, -50%);
	transition: var(--input-label-transition);
	background-color: #121218;
	font-size: clamp(11px, 1.2vh, 25px);
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
	top: 0;
	transform: translateY(-80%) scale(0.8);
	background-color: #15151b;
	padding: 0 .2em;
	color: v-bind(color);
	left: 10px;
} */

.searchBarContainer .searchIcon {
	position: absolute;
	font-size: clamp(11px, 1.2vw, 25px);
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

</style>
