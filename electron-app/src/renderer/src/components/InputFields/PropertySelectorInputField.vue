<template>
	<div class="dropDownContainer" tabindex="1" @click="onSelectorClick" @focusout="opened = false"
		:class="{ active: active, opened: opened }">
		<div class="dropDownTitle">
			<label class="dropDownLabel">{{ label }}</label>
			<div class="dropDownIcon">
				<ion-icon v-if="!opened" :class="{ active: active }" name="chevron-down-circle-outline"></ion-icon>
				<ion-icon v-else :class="{ active: active }" name="chevron-up-circle-outline"></ion-icon>
			</div>
			<label class="selectedItemText" :class="{ hasValue: selectedValue != '' }"> {{ selectedValue }}</label>
		</div>
		<div class="dropDownSelect" :class="{ opened: opened }">
			<option class="dropDownSelectOption" @click="onOptionClick({ displayName: '', backingProperty: '', type: 0 })">
			</option>
			<option class="dropDownSelectOption" v-for="(df, index) in displayFieldOptions" :key="index"
				@click="onOptionClick(df)">
				{{ df.displayName }}</option>
		</div>
		<input class="dropDownInput" type="text" />
	</div>
</template>
<script lang="ts">
import { PropertySelectorDisplayFields, PropertyType } from '../../Types/EncryptedData';
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

export default defineComponent({
	name: "PropertySelectorInputField",
	emits: ["update:modelValue", "propertyTypeChanged"],
	props: ["modelValue", "displayFieldOptions", "label", "color"],
	setup(props, ctx)
	{
		let selectedValue: Ref<string> = ref(props.modelValue);
		let opened: Ref<boolean> = ref(false);
		let active: ComputedRef<boolean> = computed(() => !!selectedValue.value || opened.value);
		let selectedPropertyType: PropertyType = PropertyType.String;

		function onSelectorClick()
		{
			opened.value = !opened.value;
		}

		function onOptionClick(df: PropertySelectorDisplayFields)
		{
			selectedValue.value = df.displayName;
			ctx.emit('update:modelValue', df.backingProperty);

			if (df.type != selectedPropertyType)
			{
				selectedPropertyType = df.type;
				if (selectedPropertyType == PropertyType.Enum)
				{
					ctx.emit("propertyTypeChanged", selectedPropertyType, df.enum);
				}
				else
				{
					ctx.emit("propertyTypeChanged", selectedPropertyType);
				}
			}
		}

		return {
			opened,
			active,
			selectedValue,
			onSelectorClick,
			onOptionClick
		}
	}
})
</script>

<style scoped>
.dropDownContainer {
	position: relative;
	height: 50px;
	width: 200px;

	border: solid 1.5px #9e9e9e;
	border-radius: 1rem;
	background: none;
	font-size: 1rem;
	color: white;
	transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);

	cursor: pointer;
}

.dropDownContainer.active {
	border: 1.5px solid v-bind(color);
}

.dropDownContainer.opened {
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
}

.dropDownContainer .dropDownTitle .dropDownLabel {
	position: absolute;
	top: 30%;
	left: 5%;
	transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
	cursor: pointer;
}

.dropDownContainer.active .dropDownTitle .dropDownLabel {
	transform: translateY(-150%) scale(0.8);
	background-color: var(--app-color);
	padding: 0 .2em;
	color: v-bind(color);
}

.dropDownContainer .dropDownTitle .dropDownIcon {
	position: absolute;
	top: 30%;
	right: 5%;
	font-size: 24px;
	color: white;
}

.dropDownContainer .dropDownTitle .dropDownIcon .active {
	color: v-bind(color);
}

.dropDownContainer .dropDownTitle .selectedItemText {
	display: none;
	color: white;
}

.dropDownContainer .dropDownTitle .selectedItemText.hasValue {
	display: block;
	position: absolute;
	top: 30%;
	left: 5%;
	transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.dropDownContainer .dropDownSelect {
	width: inherit;
	position: absolute;
	left: 0;
	bottom: 0;
	background: none;
	font-size: 1rem;
	color: white;
	transform: translate(-1.5px, 100%);
	border-bottom-left-radius: 1rem;
	border-bottom-right-radius: 1rem;
	z-index: -1;
}

.dropDownSelect.opened {
	border-left: 1.5px solid v-bind(color);
	border-right: 1.5px solid v-bind(color);
	border-bottom: 1.5px solid v-bind(color);
}

.dropDownContainer .dropDownSelect:focus,
.dropDownContainer .dropDownSelect:active {
	outline: none;
}

.dropDownSelect .dropDownSelectOption {
	display: none;
	background-color: var(--app-color);
}

.dropDownSelect.opened .dropDownSelectOption {
	display: block;
	text-align: left;
	padding-left: 10px;
}

.dropDownSelect.opened .dropDownSelectOption:last-child {
	border-bottom-left-radius: 1rem;
	border-bottom-right-radius: 1rem;
}

.dropDownSelect.opened .dropDownSelectOption:hover {
	background-color: grey;
}

.dropDownInput {
	position: absolute;
	display: none;
}
</style>
