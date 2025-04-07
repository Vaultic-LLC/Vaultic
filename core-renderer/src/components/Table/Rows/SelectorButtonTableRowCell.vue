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
        const selectorButtonModel: ComputedRef<SelectorButtonModel> = computed(() =>
		{
            const model: SelectorButtonModel = 
            {
                isActive: computed(() => props.data.isActive(props.model)),
                color: ref(props.data["color"]),
                onClick
            }

            return model;
		});

        async function onClick()
        {
            await props.data["onClick"](props.model);
        }

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
