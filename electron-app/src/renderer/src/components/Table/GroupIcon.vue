<template>
	<div ref="groupIcon" class="groupIcon" @mouseenter="" @mouseleave="">
		<span class="groupText">
			{{ groupModel.iconDisplayText }}
		</span>
	</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, Ref, ref } from 'vue';

import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // optional for styling
import 'tippy.js/animations/scale.css';
import { GroupIconModel } from '@renderer/Types/Models';

export default defineComponent({
	name: "GroupIcon",
	props: ["model", "displayOverride"],
	setup(props)
	{
		const groupIcon: Ref<HTMLElement | null> = ref(null);
		let groupModel: ComputedRef<GroupIconModel> = computed(() => props.model);

		onMounted(() =>
		{
			if (groupIcon.value)
			{
				tippy(groupIcon.value, {
					content: groupModel.value.toolTipText,
					inertia: true,
					animation: 'scale',
					theme: 'material',
					placement: 'top'
				});
			}
		});

		return {
			groupIcon,
			groupModel
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
	background: v-bind('groupModel.color');
	box-shadow: 0 0 10px v-bind('groupModel.color');
}

.groupIcon:hover {
	transform: scale(1.1);
}

.groupText {
	user-select: none;
}
</style>
