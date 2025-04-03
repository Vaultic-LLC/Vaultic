<template>
    <div class="encryptedInputCellContainer">
        <EncryptedInputField :label="label" v-model="modelField" :fadeIn="false" :showRandom="false"
            :showUnlock="false" :required="true" :colorModel="colorModel" :isInitiallyEncrypted="isInitiallyEncrypted"
            :width="''" :maxWidth="''" :minWidth="''" :height="'4vh'" @onDirty="onDirty" />
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from 'vue';

import EncryptedInputField from '../../InputFields/EncryptedInputField.vue';
import { defaultInputColorModel, InputColorModel } from '../../../Types/Models';

export default defineComponent({
	name: "EncryptedInputCell",
	components:
	{
		EncryptedInputField
	},
	props: ["model", "field", "data", "state"],
	setup(props)
	{
        const modelField: Ref<any> = ref(props.model[props.field]);
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.data["color"]));
        const label: ComputedRef<string> = computed(() => props.data["label"]);
        const onDirty: ComputedRef<() => void> = computed(() => () => props.data["onDirty"](props.model));
        const isInitiallyEncrypted: ComputedRef<boolean> = computed(() => props.state["isInitiallyEncrypted"]);

        watch(() => modelField.value, (newValue) =>
        {
            props.model[props.field] = newValue;
        });

		return {
            modelField,
            label,
            colorModel,
            onDirty,
            isInitiallyEncrypted
		};
	},
})
</script>
<style scoped>
.encryptedInputCellContainer {
    width: 100%;
}
</style>
