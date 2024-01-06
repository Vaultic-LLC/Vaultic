<template>
	<div class="objectInputFieldContainer">
		<div v-if="showUnlockIcon" class="objectInputControl unlock" @click="unlock">
			<ion-icon class="objectInputControlIcon" name="lock-open-outline"></ion-icon>
		</div>
		<div v-if="allowAdd" class="objectInputControl add" @click="onAdd()">
			<ion-icon class="objectInputControlIcon" name="add-outline"></ion-icon>
		</div>
		<div class="objectInputFieldContent">
			<label v-if="border && !hideTitle" class="objectInputFieldLabel">{{ title }}</label>
			<TableTemplate :class="{ border: border, scrollbar: scrollbar }" :color="color" :scrollbarSize="0"
				:rowGap="rowGap" :style="{
					'position': 'relative', 'max-height': `${maxHeight}px`, 'minHeight': `${minHeight}px`,
					'height': height, 'width': '100%'
				}" @scrolledToBottom="loadNextChunk()">
				<template #header>
					<slot name="header"></slot>
				</template>
				<template #body>
					<slot name="body"></slot>
				</template>
			</TableTemplate>
		</div>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, ref } from 'vue';

import TableTemplate from '../Table/TableTemplate.vue';
import { DecryptFunctionsKey, RequestAuthorizationKey } from '../../Types/Keys';

export default defineComponent({
	name: "ObjectInputField",
	components:
	{
		TableTemplate,
	},
	props: ['color', 'hideTitle', 'title', 'height', 'maxHeight', 'minHeight', 'allowAdd', 'onAdd', 'showUnlock',
		'border', 'scrollbar', 'rowGap', 'loadNextChunk'],
	setup(props)
	{
		const primaryColor: ComputedRef<string> = computed(() => props.color);

		const requstAuthorization: Ref<boolean> = inject(RequestAuthorizationKey, ref(false));
		const decryptFunctions: Ref<{ (key: string): void }[]> = inject(DecryptFunctionsKey, ref([]));

		const showUnlockIcon: Ref<boolean> = ref(props.showUnlock);

		function unlock()
		{
			requstAuthorization.value = true;
		}

		function onAuthorizationSuccessful(key: string)
		{
			showUnlockIcon.value = false;
		}

		onMounted(() =>
		{
			decryptFunctions.value.push(onAuthorizationSuccessful);
		});

		return {
			primaryColor,
			showUnlockIcon,
			unlock
		}
	}
})
</script>

<style>
.objectInputFieldContainer {
	position: relative;
}

.objectInputControl {
	width: inherit;
	display: flex;
	justify-content: flex-end;
	background-color: var(--app-color);
	position: absolute;
	top: 0;
	transform: translateY(-50%);
	z-index: 9;
	transition: 0.3s;
	border: 2px solid v-bind(primaryColor);
	border-radius: 50%;
}

.objectInputControl.add {
	right: 10px;
}

.objectInputControl.unlock {
	right: 70px;
}

.objectInputControl:hover {
	box-shadow: 0 0 25px v-bind(primaryColor);
}

.objectInputControl .objectInputControlIcon {
	color: v-bind(primaryColor);
	font-size: 2.5rem;
	transition: 0.3s;
}

.objectInputControl.unlock .objectInputControlIcon {
	font-size: 2rem;
	padding: 5px;
}

.objectInputFieldContent {
	position: relative;
}

.objectInputFieldLabel {
	position: absolute;
	top: 0;
	left: 5%;
	transform: translateY(-80%);
	color: v-bind(primaryColor);
	background-color: var(--app-color);
	z-index: 10;
	padding: 10px;
}
</style>
