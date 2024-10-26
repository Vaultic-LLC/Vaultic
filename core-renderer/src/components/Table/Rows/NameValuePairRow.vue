<template>
    <div class="nameValuePairRowContainer">
        <div class="nameValuePairRowContainer__left">
            <EncryptedInputField :colorModel="colorModel" :label="'Value'" v-model="valueValue" :showCopy="true"
                :disabled="true" :width="'11vw'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'"
                :isOnWidget="true" />
            <!-- <TextAreaInputField :colorModel="colorModel" :label="'Additional Information'"
				v-model="nameValuePair.additionalInformation" :width="'12vw'" :height="'9vh'" :maxHeight="'135px'"
				:maxWidth="'300px'" :minWidth="'120px'" :isOnWidget="true" :disabled="true" :isEditing="true" /> -->
        </div>
        <div class="nameValuePairRowContainer__right">
            <img class="nameValuePairRowContainer__qrCode" :src="qrCodeUrl" />
        </div>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import TextAreaInputField from '../../../components/InputFields/TextAreaInputField.vue';
import EncryptedInputField from '../../../components/InputFields/EncryptedInputField.vue';

import { defaultInputColor } from '../../../Types/Colors';
import { InputColorModel } from '../../../Types/Models';
import { ReactiveValue } from '../../../Objects/Stores/ReactiveValue';
import cryptHelper from '../../../Helpers/cryptHelper';
import { generateMFAQRCode } from '../../../Helpers/generatorHelper';
import { NameValuePairType } from '../../../Types/DataTypes';

export default defineComponent({
    name: "NameValuePairRow",
    components:
    {
        TextAreaInputField,
        EncryptedInputField
    },
    props: ["value", "authenticationPromise", "color", "isShowing"],
    setup(props)
    {
        const textColor: string = defaultInputColor;
        const value: ComputedRef<ReactiveValue> = computed(() => JSON.vaulticParse(JSON.vaulticStringify(props.value)));
        let valueValue: Ref<string> = ref(value.value.value.value);

        const showQRCode: ComputedRef<boolean> = computed(() => value.value.valueType?.value === NameValuePairType.MFAKey);
        const qrCodeUrl: Ref<string> = ref('');

        const colorModel: Ref<InputColorModel> = ref({
            color: props.color,
            textColor: defaultInputColor,
            activeTextColor: defaultInputColor,
            borderColor: "rgba(118, 118, 118, 0.3)",
            activeBorderColor: "rgba(118, 118, 118, 0.3)"
        });

        watch(() => props.authenticationPromise as Promise<string>, (newValue) =>
        {
            newValue?.then((key: string) =>
            {
                cryptHelper.decrypt(key, valueValue.value).then((result) =>
                {
                    if (!result.success)
                    {
                        return;
                    }

                    valueValue.value = result.value ?? "";
                    if (showQRCode.value && result.value)
                    {
                        generateMFAQRCode(value.value.name.value, result.value).then((url) =>
                        {
                            qrCodeUrl.value = url;
                        }).catch(() => { });
                    }
                });
            }).catch(() =>
            {
                // auth was cancelled
            });
        });

        watch(() => props.isShowing, (newValue) =>
        {
            if (!newValue)
            {
                valueValue.value = value.value.value.value;
            }
        });

        return {
            nameValuePair: props.value,
            valueValue,
            textColor,
            colorModel,
            showQRCode,
            qrCodeUrl
        }
    }
})
</script>

<style>
.nameValuePairRowContainer {
    display: flex;
    max-height: inherit;
}

.nameValuePairRowContainer__left {
    display: flex;
    flex-direction: column;
    row-gap: 2vw;
    margin-right: clamp(50px, 5vw, 100px);
}

.nameValuePairRowContainer__right {
    display: flex;
    justify-content: center;
    flex-grow: 1;
}

.nameValuePairRowContainer__qrCode {
    height: 50%;
    transform: translate(4vw);
}
</style>
