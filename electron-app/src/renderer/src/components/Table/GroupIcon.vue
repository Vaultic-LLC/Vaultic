<template>
	<div class="groupIcon" @mouseenter="text = currentGroup.name" @mouseleave="text = currentGroup.name[0]">
		<span class="groupText">
			{{ text }}
		</span>
	</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref } from 'vue';
import { Group } from '../../Types/Table';

export default defineComponent({
	name: "GroupIcon",
	props: ["group"],
	setup(props)
	{
		let currentGroup: ComputedRef<Group> = computed(() => props.group);
		let groupColor: ComputedRef<string> = computed(() => currentGroup.value.color);
		let text: Ref<string> = ref(currentGroup.value.name[0]);

		return {
			currentGroup,
			groupColor,
			text
		}
	},
})
</script>
<style>
.groupIcon {
	width: 40px;
	height: 40px;
	border-radius: 25px;
	display: flex;
	justify-content: center;
	align-items: center;
	margin: 5px;
	transition: 0.5s;
	background-color: v-bind(groupColor);
	box-shadow: 0 0 10px v-bind(groupColor);
}

.groupIcon:hover {
	transform: scale(1.5);
}

.groupText {
	user-select: none;
}
</style>
