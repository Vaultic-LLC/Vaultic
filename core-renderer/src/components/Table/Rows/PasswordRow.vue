<template>
    <div class="passwordRowContainer">
        <div class="passwordRowContainer__left">
            <EncryptedInputField :colorModel="colorModel" :label="'Password'" v-model="passwordValue"
                :initialLength="value.passwordLength" :showCopy="true" :disabled="true" :isInitiallyEncrypted="false"
                :isOnWidget="true" :width="'11vw'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" />
            <!-- <TextAreaInputField :colorModel="colorModel" :label="'Additional Information'" :isOnWidget="true"
				v-model="pword.additionalInformation" :disabled="true" :width="'12vw'" :height="'9vh'"
				:maxHeight="'135px'" :maxWidth="'300px'" :minWidth="'120px'" :isEditing="true" /> -->
        </div>
        <TableTemplate :color="textColor" class="scrollbar passwordRowContainer__table" :scrollbar-size="1"
            :border="false" :row-gap="'0px'" :emptyMessage="emptyMessage" :hideHeader="true"
            :showEmptyMessage="securityQuestions.size == 0" :backgroundColor="backgroundColor"
            :initialPaddingRow="false">
            <template #body>
                <SecurityQuestionRow v-for="(sq, index) in securityQuestions" :key="sq[0]" :rowNumber="index"
                    :colorModel="colorModel" :model="sq[1].value" :disabled="true" :isInitiallyEncrypted="false" />
            </template>
        </TableTemplate>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import TableTemplate from '../TableTemplate.vue';
import SecurityQuestionRow from '../Rows/SecurityQuestionRow.vue';

import TextAreaInputField from '../../../components/InputFields/TextAreaInputField.vue';
import EncryptedInputField from '../../../components/InputFields/EncryptedInputField.vue';
import { HeaderTabModel, InputColorModel } from '../../../Types/Models';
import { defaultInputColor } from '../../../Types/Colors';
import { ReactivePassword } from '../../../Objects/Stores/ReactivePassword';
import cryptHelper from '../../../Helpers/cryptHelper';
import { SecurityQuestion } from '../../../Types/DataTypes';
import { Field } from '@vaultic/shared/Types/Fields';

export default defineComponent({
    name: "PasswordRow",
    components:
    {
        TextAreaInputField,
        EncryptedInputField,
        TableTemplate,
        SecurityQuestionRow
    },
    props: ["value", "authenticationPromise", "color", 'isShowing'],
    setup(props)
    {
        const textColor: string = "#7676764d";
        const backgroundColor: string = "transparent";
        const colorModel: Ref<InputColorModel> = ref({
            color: props.color,
            textColor: defaultInputColor,
            activeTextColor: defaultInputColor,
            borderColor: "rgba(118, 118, 118, 0.3)",
            activeBorderColor: "rgba(118, 118, 118, 0.3)"
        });

        // copy password so we don't accidentally edit it
        const password: ComputedRef<Field<ReactivePassword>> = computed(() => JSON.vaulticParse(JSON.vaulticStringify(props.value)));
        let passwordValue: Ref<string> = ref(password.value.value.password.value);
        let securityQuestions: Ref<Map<string, Field<SecurityQuestion>>> = ref(password.value.value.securityQuestions.value);

        const emptyMessage: Ref<string> = ref('This Password does not have any Security Questions. Click the Edit Icon to add some');

        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Security Questions',
                active: computed(() => true),
                color: computed(() => textColor),
                size: 'small',
                onClick: () => { }
            }
        ];

        watch(() => props.authenticationPromise as Promise<string>, (newValue) =>
        {
            newValue?.then(async (key: string) =>
            {
                cryptHelper.decrypt(key, passwordValue.value).then((result) =>
                {
                    if (!result.success)
                    {
                        return;
                    }

                    passwordValue.value = result.value ?? "";
                });

                // TODO: pretty sure this will edit the actual security question objects since they are objects, which is not good
                // securityQuestions.value.forEach(sq =>
                // {
                //     cryptHelper.decrypt(key, sq.question).then((result) =>
                //     {
                //         if (!result.success)
                //         {
                //             return;
                //         }

                //         sq.question = result.value ?? "";
                //     });

                //     cryptHelper.decrypt(key, sq.answer).then((result) =>
                //     {
                //         if (!result.success)
                //         {
                //             return;
                //         }

                //         sq.answer = result.value ?? "";
                //     });
                // });
            }).catch(() =>
            {
                // auth was cancelled
            });
        });

        watch(() => props.isShowing, (newValue) =>
        {
            if (!newValue)
            {
                passwordValue.value = password.value.value.password.value;
                securityQuestions.value = password.value.value.securityQuestions.value;
            }
        });

        return {
            pword: props.value,
            securityQuestions,
            passwordValue,
            textColor,
            emptyMessage,
            headerTabs,
            backgroundColor,
            colorModel,
        }
    }
})
</script>

<style>
.passwordRowContainer {
    display: flex;
    max-height: inherit;
}

.passwordRowContainer__left {
    display: flex;
    flex-direction: column;
    row-gap: 2vw;
    margin-right: clamp(50px, 5vw, 100px);
}

.passwordRowContainer__table {
    position: relative !important;
    flex-grow: 1;
    opacity: 0;
    animation: fadeIn 1s linear forwards;
}
</style>
