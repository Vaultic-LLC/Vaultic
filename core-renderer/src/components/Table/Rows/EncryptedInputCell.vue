<template>
    <div class="encryptedInputCellContainer">
        <EncryptedInputField :label="label" v-model="modelField.value" :initialLength="initialLengthField.value" :fadeIn="false" :showRandom="false"
            :showUnlock="false" :required="true" :colorModel="colorModel" :isInitiallyEncrypted="isInitiallyEncrypted" @onDirty="onDirty" />
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref } from 'vue';

import { Field } from '@vaultic/shared/Types/Fields';
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
        const modelField: Ref<Field<any>> = ref(props.model.value[props.field]);
        const initialLengthField: Ref<Field<any>> = ref(props.model.value[props.data['initalLengthField']]);
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.data["color"]));
        const label: ComputedRef<string> = computed(() => props.data["label"]);
        const onDirty: ComputedRef<() => void> = computed(() => () => props.data["onDirty"](props.model));
        const isInitiallyEncrypted: ComputedRef<boolean> = computed(() => props.state["isInitiallyEncrypted"]);

		return {
            modelField,
            initialLengthField,
            label,
            colorModel,
            onDirty,
            isInitiallyEncrypted
		};
	},
})
</script>
<style scoped>

</style>
