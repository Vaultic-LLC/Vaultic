<template>
    <ObjectView :title="'Password'" :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <VaulticFieldset>
            <TextInputField class="passwordView__passwordFor" :color="color" :label="'Password For'"
                v-model="passwordState.passwordFor.value" :width="'50%'" :maxWidth="''" :maxHeight="''" />
            <TextInputField class="passwordView__username" :color="color" :label="'Username'" v-model="passwordState.login.value"
                :width="'50%'" :maxWidth="''" :maxHeight="''" />
        </VaulticFieldset>
        <VaulticFieldset>
            <EncryptedInputField ref="passwordInputField" class="passwordView__password" :colorModel="colorModel"
                :label="'Password'" v-model="passwordState.password.value" :isInitiallyEncrypted="isInitiallyEncrypted" 
                :showRandom="true" :showUnlock="true" :required="true"
                showCopy="true" :width="'50%'" :maxWidth="''" :maxHeight="''" @onDirty="passwordIsDirty = true" />
            <TextInputField class="passwordView__domain" :inputGroupAddon="'www'" :color="color" :label="'Domain'" v-model="passwordState.domain.value"
                :showToolTip="true"
                :toolTipMessage="'Domain is used to search for Breached Passwords. An example is facebook.com'"
                :toolTipSize="'clamp(15px, 1vw, 28px)'" :width="'50%'" :maxWidth="''" :maxHeight="''" />
        </VaulticFieldset>
        <VaulticFieldset>
            <TextInputField class="passwordView__email" :color="color" :label="'Email'" v-model="passwordState.email.value"
                :width="'50%'" :isEmailField="true" :maxWidth="''" :maxHeight="''" />
            <ObjectMultiSelect :label="'Groups'" :color="color" v-model="selectedGroups" :options="groupOptions" :width="'50%'" 
                :maxWidth="''" :maxHeight="''" />
        </VaulticFieldset>
        <VaulticFieldset :fillSpace="true" :static="true">
            <TextAreaInputField class="passwordView__additionalInformation" :colorModel="colorModel"
                :label="'Additional Information'" v-model="passwordState.additionalInformation.value" :width="'50%'"
                :height="''" :minWidth="'216px'" :minHeight="''" :maxHeight="''" :maxWidth="''" />
            <VaulticTable ref="tableRef" id="passwordView__table" :color="color" :columns="tableColumns" 
                :headerTabs="headerTabs" :dataSources="tableDataSources" :emptyMessage="emptyMessage" :allowPinning="false" :allowSearching="false"
                :onDelete="onDeleteSecurityQuestion">
                <template #tableControls>
                    <Transition name="fade" mode="out-in">
                        <div class="passwordViewTableHeaderControls">
                            <UnlockButton v-if="locked" :color="color" @onAuthSuccessful="locked = false" />
                            <AddButton :color="color" @click="onAddSecurityQuestion" />
                        </div>                
                    </Transition>
                </template>
            </VaulticTable>
        </VaulticFieldset>
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted, Reactive, reactive } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import AddButton from '../Table/Controls/AddButton.vue';
import UnlockButton from "../UnlockButton.vue"
import VaulticTable from '../Table/VaulticTable.vue';
import ObjectMultiSelect from '../InputFields/ObjectMultiSelect.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';

import { Password, SecurityQuestion, defaultPassword } from '../../Types/DataTypes';
import { FieldedTableRowModel, GridDefinition, HeaderTabModel, InputColorModel, ObjectSelectOptionModel, TableColumnModel, TableDataSources, TableRowModel, defaultInputColorModel } from '../../Types/Models';
import { getEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import app from "../../Objects/Stores/AppStore";
import { generateUniqueIDForMap } from '../../Helpers/generatorHelper';
import { EncryptedInputFieldComponent, TableTemplateComponent } from '../../Types/Components';
import { Field } from '@vaultic/shared/Types/Fields';
import { WebFieldConstructor } from '../../Types/Fields';

export default defineComponent({
    name: "PasswordView",
    components: {
        ObjectView,
        TextInputField,
        EncryptedInputField,
        TextAreaInputField,
        AddButton,
        UnlockButton,
        VaulticTable,
        ObjectMultiSelect,
        VaulticFieldset
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const passwordInputField: Ref<EncryptedInputFieldComponent | null> = ref(null);

        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const refreshKey: Ref<string> = ref("");
        const passwordState: Ref<Password> = ref(props.model);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value);
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(color.value));

        const securityQuestions: SortedCollection = new SortedCollection([]);
        const isInitiallyEncrypted: Ref<boolean> = ref(!props.creating);

        const passwordIsDirty: Ref<boolean> = ref(false);
        const dirtySecurityQuestionQuestions: Ref<string[]> = ref([]);
        const dirtySecurityQuestionAnswers: Ref<string[]> = ref([]);

        const locked: Ref<boolean> = ref(!props.creating);

        const selectedGroups: Ref<ObjectSelectOptionModel[]> = ref([]);
        const groupOptions: Ref<ObjectSelectOptionModel[]> = ref([]);

        const gridDefinition: GridDefinition = {
            rows: 1,
            rowHeight: '100%',
            columns: 1,
            columnWidth: '100%'
        }

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const emptyMessage: ComputedRef<string> = computed(() =>
        {
            return getEmptyTableMessage("Security Questions");
        });

        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Security Questions',
                active: computed(() => true),
                color: color,
            }
        ];

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = [];
            models.push(new TableColumnModel("Question", "question").setComponent("EncryptedInputCell")
                .setData({ color: color.value, label: 'Question', onDirty: onQuestionDirty }).setSortable(false));

            models.push(new TableColumnModel("Answer", "answer").setComponent("EncryptedInputCell")
                .setData({ color: color.value, label: 'Answer', onDirty: onAnswerDirty }).setSortable(false)); 
        
            return models;
        });

        const tableDataSources: Reactive<TableDataSources> = reactive(
        {
            activeIndex: () => 0,
            dataSources: 
            [
                {
                    friendlyDataTypeName: "Security Question",
                    collection: securityQuestions
                }
            ]
        });

        function setSecurityQuestionModels()
        {
            const securityQuestionRows: FieldedTableRowModel<Field<SecurityQuestion>>[] = [];
            passwordState.value.securityQuestions.value.forEach((v, k) => 
            {
                securityQuestionRows.push(new FieldedTableRowModel(k, false, undefined, v, 
                {
                    isInitiallyEncrypted: isInitiallyEncrypted.value
                }));
            });

            securityQuestions.updateValues(securityQuestionRows);
        }

        function onSave()
        {
            passwordInputField.value?.toggleMask(true);
            app.popups.showRequestAuthentication(color.value, onAuthenticationSuccessful, onAuthenticationCanceled);

            return new Promise((resolve, reject) =>
            {
                saveSucceeded = resolve;
                saveFailed = reject;
            });
        }

        async function onAuthenticationSuccessful(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Saving Password");

            passwordState.value.groups.value = new Map();
            selectedGroups.value.forEach(g => 
            {
                passwordState.value.groups.addMapValue(g.backingObject!.value.id.value, WebFieldConstructor.create(g.backingObject!.value.id.value));
            });

            if (props.creating)
            {
                if (await app.currentVault.passwordStore.addPassword(key, passwordState.value))
                {
                    passwordState.value = defaultPassword();
                    refreshKey.value = Date.now().toString();
                    selectedGroups.value = [];

                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }
            else
            {
                if (await app.currentVault.passwordStore.updatePassword(key,
                    passwordState.value, passwordIsDirty.value, dirtySecurityQuestionQuestions.value,
                    dirtySecurityQuestionAnswers.value))
                {
                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }
        }

        function handleSaveResponse(succeeded: boolean)
        {
            app.popups.hideLoadingIndicator();
            if (succeeded)
            {
                if (saveSucceeded)
                {
                    saveSucceeded(true);
                }
            }
            else
            {
                if (saveFailed)
                {
                    saveFailed(true);
                }
            }
        }

        function onAuthenticationCanceled()
        {
            saveFailed(false);
        }

        async function onAddSecurityQuestion()
        {
            const id = await generateUniqueIDForMap(passwordState.value.securityQuestions.value);
            const securityQuestion: Field<SecurityQuestion> = WebFieldConstructor.create({
                id: WebFieldConstructor.create(id),
                question: WebFieldConstructor.create(''),
                answer: WebFieldConstructor.create(''),
            });

            passwordState.value.securityQuestions.addMapValue(id, securityQuestion);

            const securityQuestionModel: FieldedTableRowModel<Field<SecurityQuestion>> = new FieldedTableRowModel(
                securityQuestion.id, undefined, undefined, securityQuestion, 
                {
                    isInitiallyEncrypted: false
                });

            securityQuestions.push(securityQuestionModel);
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function onQuestionDirty(securityQuestion: Field<SecurityQuestion>)
        {
            if (!dirtySecurityQuestionQuestions.value.includes(securityQuestion.value.id.value))
            {
                dirtySecurityQuestionQuestions.value.push(securityQuestion.value.id.value);
            }
        }

        function onAnswerDirty(securityQuestion: Field<SecurityQuestion>)
        {
            if (!dirtySecurityQuestionAnswers.value.includes(securityQuestion.value.id.value))
            {
                dirtySecurityQuestionAnswers.value.push(securityQuestion.value.id.value);
            }
        }

        function onDeleteSecurityQuestion(securityQuestion: Field<SecurityQuestion>)
        {
            passwordState.value.securityQuestions.value.delete(securityQuestion.value.id.value);
            if (dirtySecurityQuestionQuestions.value.includes(securityQuestion.value.id.value))
            {
                dirtySecurityQuestionQuestions.value.splice(dirtySecurityQuestionQuestions.value.indexOf(securityQuestion.value.id.value), 1);
            }

            if (dirtySecurityQuestionAnswers.value.includes(securityQuestion.value.id.value))
            {
                dirtySecurityQuestionAnswers.value.splice(dirtySecurityQuestionAnswers.value.indexOf(securityQuestion.value.id.value), 1);
            }

            securityQuestions.remove(securityQuestion.value.id.value);
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        onMounted(() =>
        {
            setSecurityQuestionModels();
            groupOptions.value = app.currentVault.groupStore.passwordGroups.map(g => 
            {
                const option: ObjectSelectOptionModel = 
                {
                    label: g.value.name.value,
                    backingObject: g,
                    icon: g.value.icon.value,
                    color: g.value.color.value
                };

                return option
            });

            passwordState.value.groups.value.forEach((v, k) => 
            {
                const group = app.currentVault.groupStore.passwordGroupsByID.value.get(k);
                if (!group)
                {
                    return;
                }

                selectedGroups.value.push({
                    label: group.value.name.value,
                    backingObject: group,
                    icon: group.value.icon.value,
                    color: group.value.color.value
                });
            });
        });

        return {
            passwordInputField,
            color,
            passwordState,
            refreshKey,
            isInitiallyEncrypted,
            passwordIsDirty,
            gridDefinition,
            headerTabs,
            emptyMessage,
            locked,
            colorModel,
            tableRef,
            tableDataSources,
            tableColumns,
            selectedGroups,
            groupOptions,
            onAuthenticationSuccessful,
            onAuthenticationCanceled,
            onSave,
            onAddSecurityQuestion,
            onQuestionDirty,
            onAnswerDirty,
            onDeleteSecurityQuestion,
        };
    },
})
</script>

<style>
#passwordView__table {
    right: 0;
    width: 49%;
    height: 88%;
    height: calc(102% - clamp(40px, 5vh, 60px));
}

.passwordViewTableHeaderControls {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    column-gap: clamp(10px, 1vw, 25px);
}
</style>
