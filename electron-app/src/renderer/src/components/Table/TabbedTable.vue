<template>
	<div class="tableContainer" ref="tableContainer">
		<table class="tableContent">
			<slot name="header"></slot>
			<slot name="body">
			</slot>
		</table>
	</div>
</template>

<script lang="ts">
import { defineComponent, inject, onUpdated, Ref, ref } from 'vue';
import { PrimaryColorKey } from '../../Types/Keys';

export default defineComponent({
	name: "TableTemplate",
	setup()
	{
		const tableContainer: Ref<HTMLElement | null> = ref(null);

		let primaryColor: Ref<string> | undefined = inject(PrimaryColorKey);
		let scrollbarColor: Ref<string> = ref(primaryColor?.value ?? '#0f111d');

		function calcScrollbarColor()
		{
			if (!primaryColor?.value)
			{
				return;
			}

			if (tableContainer.value?.scrollHeight && tableContainer.value.clientHeight)
			{
				if (tableContainer.value?.scrollHeight <= tableContainer.value?.clientHeight)
				{
					scrollbarColor.value = primaryColor.value;
				}
				else
				{
					scrollbarColor.value = '#0f111d';
				}
			}
		}

		onUpdated(() =>
		{
			calcScrollbarColor();
		});

		return {
			tableContainer,
			primaryColor,
			scrollbarColor,
		}
	},
})
</script>

<style scoped>
.tableContainer {
	/* height: 900px;
    width: 95%; */
	position: absolute;
	overflow-x: auto;
	border-radius: 20px;
	/* background: linear-gradient(145deg, rgba(17, 19, 29, 0.5), rgba(20, 22, 34, 0.5)); */
	/* background: rgba(17, 19, 29, 0.5); */
	background-color: #161e29;
	margin-left: auto;
	margin-right: 1.1%;

	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	direction: rtl;

	overflow-y: scroll;
}

.tableContent {
	margin-left: auto;
	margin-right: 1.5%;
	border-spacing: 0 10px;

	width: 95%;
	border-collapse: collapse;
	direction: ltr;
}

.tableContainer::-webkit-scrollbar {
	width: 10px;
}

.tableContainer::-webkit-scrollbar-track {
	background: v-bind(scrollbarColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.tableContainer::-webkit-scrollbar-thumb {
	background: v-bind(primaryColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}
</style>
