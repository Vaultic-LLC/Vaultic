<template>
    <ObjectView :title="'Password'" :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField class="passwordView__passwordFor" :color="color" :label="'Password For'"
            v-model="passwordState.passwordFor.value" :width="'8vw'" :height="'4vh'" :minHeight="'30px'" />
        <TextInputField class="passwordView__domain" :color="color" :label="'Domain'" v-model="passwordState.domain.value"
            :showToolTip="true"
            :toolTipMessage="'Domain is used to search for Breached Passwords. An example is facebook.com'"
            :toolTipSize="'clamp(15px, 1vw, 28px)'" :width="'8vw'" :height="'4vh'" :minHeight="'30px'" />
        <TextInputField class="passwordView__email" :color="color" :label="'Email'" v-model="passwordState.email.value"
            :width="'8vw'" :height="'4vh'" :minHeight="'30px'" :isEmailField="true" />
        <TextInputField class="passwordView__username" :color="color" :label="'Username'" v-model="passwordState.login.value"
            :width="'8vw'" :height="'4vh'" :minHeight="'30px'" />
        <EncryptedInputField ref="passwordInputField" class="passwordView__password" :colorModel="colorModel"
            :label="'Password'" v-model="passwordState.password.value" :initialLength="initalLength"
            :isInitiallyEncrypted="isInitiallyEncrypted" :showRandom="true" :showUnlock="true" :required="true"
            showCopy="true" :width="'11vw'" :maxWidth="'285px'" :height="'4vh'" :minHeight="'30px'"
            @onDirty="passwordIsDirty = true" />
        <TextAreaInputField class="passwordView__additionalInformation" :colorModel="colorModel"
            :label="'Additional Information'" v-model="passwordState.additionalInformation.value" :width="'19vw'"
            :height="'15vh'" :minWidth="'216px'" :minHeight="'91px'" :maxHeight="'203px'" />
        <VaulticTable ref="tableRef" id="passwordView__table" :color="color" :columns="tableColumns" 
            :headerTabs="headerTabs" :dataSources="tableDataSources" :emptyMessage="emptyMessage" :allowPinning="false" :searchBarSizeModel="searchBarSizeModel"
            :onDelete="activeTab == 0 ? onDeleteSecurityQuestion : undefined">
            <template #tableControls>
                <Transition name="fade" mode="out-in">
                    <div v-if="activeTab == 0" class="passwordViewTableHeaderControls">
                        <UnlockButton v-if="locked" :color="color" @onAuthSuccessful="locked = false" />
                        <AddButton :color="color" @click="onAddSecurityQuestion" />
                    </div>                
                </Transition>
            </template>
        </VaulticTable>
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted, provide, Reactive, reactive } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import AddButton from '../Table/Controls/AddButton.vue';
import UnlockButton from "../UnlockButton.vue"
import VaulticTable from '../Table/VaulticTable.vue';

import { Password, SecurityQuestion, defaultPassword } from '../../Types/DataTypes';
import { ComponentSizeModel, GridDefinition, HeaderTabModel, InputColorModel, SelectableBackingObject, TableColumnModel, TableDataSources, TableRowModel, defaultInputColorModel } from '../../Types/Models';
import { getEmptyTableMessage, getObjectPopupEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import app from "../../Objects/Stores/AppStore";
import { generateUniqueIDForMap } from '../../Helpers/generatorHelper';
import { EncryptedInputFieldComponent, TableTemplateComponent } from '../../Types/Components';
import { Field } from '@vaultic/shared/Types/Fields';

interface SelectableGroup extends SelectableBackingObject
{
    name: Field<string>;
    color: Field<string>;
}

export default defineComponent({
    name: "PasswordView",
    components: {
        ObjectView,
        TextInputField,
        EncryptedInputField,
        TextAreaInputField,
        AddButton,
        UnlockButton,
        VaulticTable
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
        const groups: SortedCollection = new SortedCollection([]);
        const initalLength: Ref<number> = ref(passwordState.value.passwordLength.value ?? 0);
        const isInitiallyEncrypted: Ref<boolean> = ref(!props.creating);

        const passwordIsDirty: Ref<boolean> = ref(false);
        const dirtySecurityQuestionQuestions: Ref<string[]> = ref([]);
        const dirtySecurityQuestionAnswers: Ref<string[]> = ref([]);

        const locked: Ref<boolean> = ref(!props.creating);

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
            if (activeTab.value == 0)
            {
                return getEmptyTableMessage("Security Questions");
            }

            return getObjectPopupEmptyTableMessage("Groups", "Password", "Group", props.creating);
        });

        const activeTab: Ref<number> = ref(0);
        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Security Questions',
                active: computed(() => activeTab.value == 0),
                color: color,
                onClick: () =>
                {
                    activeTab.value = 0;
                }
            },
            {
                name: 'Groups',
                active: computed(() => activeTab.value == 1),
                color: color,
                onClick: () =>
                {
                    activeTab.value = 1;
                }
            },
        ];

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = [];
            if (activeTab.value == 0)
            {
                models.push({ header: "Question", field: "question", component: "EncryptedInputCell", 
                    data: { color: color.value, initalLengthField: 'questionLength', label: 'Question', onDirty: onQuestionDirty } });
                models.push({ header: "Answer", field: "answer", component: "EncryptedInputCell", 
                    data: { color: color.value, initalLengthField: 'answerLength', label: 'Answer', onDirty: onAnswerDirty } });  
            }
            else if (activeTab.value == 1)
            {
                models.push({ header: "", field: "isActive", component: 'SelectorButtonTableRowValue', data: { 'color': color, onClick: onGroupSelected } });
                models.push({ header: "Name", field: "name" });
                models.push({ header: "Color", field: "color", component: "ColorTableRowValue" });             
            }

            return models;
        });

        const tableDataSources: Reactive<TableDataSources> = reactive(
        {
            activeIndex: () => activeTab.value,
            dataSources: 
            [
                {
                    friendlyDataTypeName: "Security Question",
                    collection: securityQuestions
                },
                {
                    friendlyDataTypeName: "Group",
                    collection: groups,
                }
            ]
        });

        const searchBarSizeModel: Ref<ComponentSizeModel> = ref({
            width: '8vw',
            maxWidth: '250px',
            minWidth: '100px',
            minHeight: '27px'
        });

        function onGroupSelected(value: Field<SelectableGroup>)
        {     
            if (value.value.isActive.value)
            {
                passwordState.value.groups.value.delete(value.value.id.value);
                value.value.isActive.value = false;
            }
            else
            {
                passwordState.value.groups.value.set(value.value.id.value, new Field(value.value.id.value));
                value.value.isActive.value = true;
            }
        }

        function setGroupModels()
        {
            const groupRows = app.currentVault.groupStore.passwordGroups.map(g =>
            {
                const selectableGroup: SelectableGroup = 
                {
                    isActive: new Field(passwordState.value.groups.value.has(g.value.id.value)),
                    id: g.value.id,
                    name: g.value.name,
                    color: g.value.color
                };

                const row: TableRowModel = 
                {
                    id: g.value.id.value,
                    backingObject: new Field(selectableGroup),
                };

                return row;
            });

            groups.updateValues(groupRows);

            const securityQuestionRows: TableRowModel[] = [];
            passwordState.value.securityQuestions.value.forEach((v, k) => 
            {
                securityQuestionRows.push({
                        id: k,
                        backingObject: v,
                        state: 
                        {
                            isInitiallyEncrypted: isInitiallyEncrypted.value
                        }
                    })
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
            if (props.creating)
            {
                if (await app.currentVault.passwordStore.addPassword(key, passwordState.value))
                {
                    passwordState.value = defaultPassword();
                    refreshKey.value = Date.now().toString();

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
            const securityQuestion: Field<SecurityQuestion> = new Field({
                id: new Field(id),
                question: new Field(''),
                questionLength: new Field(0),
                answer: new Field(''),
                answerLength: new Field(0)
            });

            passwordState.value.securityQuestions.value.set(id, securityQuestion);

            const securityQuestionModel: TableRowModel = 
            {
                id: securityQuestion.id,
                backingObject: securityQuestion,
                state: {
                    isInitiallyEncrypted: false
                }
            };

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
            setGroupModels();
        });

        return {
            passwordInputField,
            color,
            passwordState,
            refreshKey,
            initalLength,
            isInitiallyEncrypted,
            passwordIsDirty,
            gridDefinition,
            activeTab,
            headerTabs,
            emptyMessage,
            locked,
            colorModel,
            tableRef,
            searchBarSizeModel,
            tableDataSources,
            tableColumns,
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
    left: 50%;
    bottom: 10%;
    transform: translateY(12px);
    height: 29vh;
    width: 27vw;
    min-height: 174px;
    min-width: 308px;
}

.passwordViewTableHeaderControls {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    column-gap: clamp(10px, 1vw, 25px);
}

.passwordView__passwordFor {
    position: absolute !important;
    left: 10%;
}

.passwordView__domain {
    position: absolute !important;
    left: 30%;
}

.passwordView__email {
    position: absolute !important;
    left: 10%;
    top: max(47px, 15%);
}

.passwordView__username {
    position: absolute !important;
    left: 30%;
    top: max(47px, 15%);
}

.passwordView__password {
    position: absolute !important;
    left: 10%;
    top: max(95px, 30%);
}

.passwordView__additionalInformation {
    position: absolute !important;
    left: 10%;
    bottom: 10%;
}
</style>
