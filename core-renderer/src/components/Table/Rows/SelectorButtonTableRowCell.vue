<template>
    <div class="selectorButtonTableRowValueContainer">
        <SelectorButton class="selectorButtonTableRowValueContainer__button" :selectorButtonModel="selectorButtonModel" />
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, Ref, ref } from 'vue';

import SelectorButton from '../../InputFields/SelectorButton.vue';
import { SelectorButtonModel } from '../../../Types/Models';

export default defineComponent({
	name: "SelectorButtonTableRowCell",
	components:
	{
		SelectorButton
	},
	props: ["model", "data"],
	setup(props)
	{
        const isActive: Ref<boolean> = ref(false)
        const selectorButtonModel: ComputedRef<SelectorButtonModel> = computed(() =>
		{
            const model: SelectorButtonModel = 
            {
                isActive: isActive,
                color: ref(props.data["color"]),
                onClick
            }

            return model;
		});

        async function onClick()
        {
            await props.data["onClick"](props.model);
            checkIsActive();
        }

        function checkIsActive()
        {
            isActive.value = props.data.isActive(props.model);
        }

        onMounted(() =>
        {
            checkIsActive();
        });

		return {
            selectorButtonModel
		};
	},
})
</script>
<style scoped>
.selectorButtonTableRowValueContainer {
    cursor: pointer;
}
</style>
