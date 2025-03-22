<template>
    <ObjectView :title="'Password'" :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <VaulticFieldset>
            <TextInputField class="passwordView__passwordFor" :color="color" :label="'Password For'"
                v-model="passwordState.f" :width="'50%'" :maxWidth="''" :maxHeight="''" />
            <TextInputField class="passwordView__username" :color="color" :label="'Username'" v-model="passwordState.l"
                :width="'50%'" :maxWidth="''" :maxHeight="''" />
        </VaulticFieldset>
        <VaulticFieldset>
            <EncryptedInputField ref="passwordInputField" class="passwordView__password" :colorModel="colorModel"
                :label="'Password'" v-model="passwordState.p" :isInitiallyEncrypted="isInitiallyEncrypted" 
                :showRandom="true" :showUnlock="true" :required="true"
                showCopy="true" :width="'50%'" :maxWidth="''" :maxHeight="''" @onDirty="passwordIsDirty = true" />
            <TextInputField class="passwordView__domain" :inputGroupAddon="'www'" :color="color" :label="'Domain'" v-model="passwordState.d"
                :showToolTip="true"
                :toolTipMessage="'Domain is used to search for Breached Passwords. An example is facebook.com'"
                :toolTipSize="'clamp(15px, 1vw, 28px)'" :width="'50%'" :maxWidth="''" :maxHeight="''" />
        </VaulticFieldset>
        <VaulticFieldset>
            <TextInputField class="passwordView__email" :color="color" :label="'Email'" v-model="passwordState.e"
                :width="'50%'" :isEmailField="true" :maxWidth="''" :maxHeight="''" />
            <ObjectMultiSelect :label="'Groups'" :color="color" v-model="selectedGroups" :options="groupOptions" :width="'50%'" 
                :maxWidth="''" :maxHeight="''" />
        </VaulticFieldset>
        <VaulticFieldset :fillSpace="true" :static="true">
            <TextAreaInputField class="passwordView__additionalInformation" :colorModel="colorModel"
                :label="'Additional Information'" v-model="passwordState.additionalInformation" :width="'50%'"
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
import { GridDefinition, HeaderTabModel, InputColorModel, ObjectSelectOptionModel, TableColumnModel, TableDataSources, TableRowModel, defaultInputColorModel } from '../../Types/Models';
import { getEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import app from "../../Objects/Stores/AppStore";
import { EncryptedInputFieldComponent, TableTemplateComponent } from '../../Types/Components';
import { uniqueIDGenerator } from '@vaultic/shared/Utilities/UniqueIDGenerator';
import { OH } from '@vaultic/shared/Utilities/PropertyManagers';
import { DictionaryAsList } from '@vaultic/shared/Types/Stores';

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

        const pendingStoreState = app.currentVault.passwordStore.getPendingState()!;
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const refreshKey: Ref<string> = ref("");
        const passwordState: Ref<Password> = ref(props.model);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.p.p);
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(color.value));

        const securityQuestions: SortedCollection = new SortedCollection([], () => allSecurityQuestions);
        const isInitiallyEncrypted: Ref<boolean> = ref(!props.creating);

        const passwordIsDirty: Ref<boolean> = ref(false);

        let allSecurityQuestions: { [key: string]: SecurityQuestion } = {};
        const addedSecurityQuestions: SecurityQuestion[] = [];
        const removedSecurityQuestions: string[] = [];
        const dirtySecurityQuestionQuestions: SecurityQuestion[] = [];
        const dirtySecurityQuestionAnswers: SecurityQuestion[] = [];

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
            models.push(new TableColumnModel("Question", "q").setComponent("EncryptedInputCell")
                .setData({ color: color.value, label: 'Question', onDirty: onQuestionDirty }).setSortable(false));

            models.push(new TableColumnModel("Answer", "a").setComponent("EncryptedInputCell")
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
            const securityQuestionRows: TableRowModel[] = [];
            OH.forEachKey(allSecurityQuestions, (k) => 
            {
                securityQuestionRows.push(new TableRowModel(k, false, undefined, 
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

            if (props.creating)
            {
                // its ok to set these since we are adding the entire object anyways
                selectedGroups.value.forEach(g => 
                {
                    passwordState.value.g[g.backingObject!.id] = true;
                });

                console.time('add password');
                if (await app.currentVault.passwordStore.addPassword(key, passwordState.value, addedSecurityQuestions, 
                    pendingStoreState))
                {
                    console.timeEnd('add password');
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
                // we want to pass the current selection instead of setting them so change tracking
                // can add them properly
                const newGroups: DictionaryAsList = {};
                selectedGroups.value.forEach(g => 
                {
                    newGroups[g.backingObject!.id] = true;
                });

                if (await app.currentVault.passwordStore.updatePassword(key,
                    passwordState.value, passwordIsDirty.value, addedSecurityQuestions, dirtySecurityQuestionQuestions,
                    dirtySecurityQuestionAnswers, removedSecurityQuestions, newGroups, pendingStoreState))
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
            const id = uniqueIDGenerator.generate();
            const securityQuestion: SecurityQuestion = {
                id: id,
                q: '',
                a: '',
            };

            allSecurityQuestions[id] = securityQuestion;
            addedSecurityQuestions.push(securityQuestion);

            const securityQuestionModel: TableRowModel = new TableRowModel(securityQuestion.id, undefined, undefined, {
                isInitiallyEncrypted: false
            });

            securityQuestions.push(securityQuestionModel);
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function onQuestionDirty(securityQuestion: SecurityQuestion)
        {
            const addedIndex = addedSecurityQuestions.findIndex(q => q.id == securityQuestion.id);
            if (addedIndex >= 0)
            {
                // we want to count this as an add, not an update
                return;
            }

            const dirtyIndex = dirtySecurityQuestionQuestions.findIndex(q => q.id == securityQuestion.id);
            if (dirtyIndex == -1)
            {
                dirtySecurityQuestionQuestions.push(securityQuestion);
            }
        }

        function onAnswerDirty(securityQuestion: SecurityQuestion)
        {
            const addedIndex = addedSecurityQuestions.findIndex(q => q.id == securityQuestion.id);
            if (addedIndex >= 0)
            {
                // we want to count this as an add, not an update
                return;
            }

            const dirtyIndex = dirtySecurityQuestionAnswers.findIndex(q => q.id == securityQuestion.id);
            if (dirtyIndex == -1)
            {
                dirtySecurityQuestionAnswers.push(securityQuestion);
            }
        }

        function onDeleteSecurityQuestion(securityQuestion: SecurityQuestion)
        {
            delete allSecurityQuestions[securityQuestion.id];

            const addedIndex = addedSecurityQuestions.findIndex(q => q.id == securityQuestion.id);
            if (addedIndex >= 0)
            {
                addedSecurityQuestions.splice(addedIndex, 1);

                // Don't want to count this as a delete since it was never offically added
                return;
            }

            const dirtyQuestionIndex = dirtySecurityQuestionQuestions.findIndex(q => q.id == securityQuestion.id);
            if (dirtyQuestionIndex >= 0)
            {
                dirtySecurityQuestionQuestions.splice(dirtyQuestionIndex, 1);
            }

            const dirtyAnswerIndex = dirtySecurityQuestionAnswers.findIndex(q => q.id == securityQuestion.id);
            if (dirtyAnswerIndex >= 0)
            {
                dirtySecurityQuestionAnswers.splice(dirtyAnswerIndex, 1);
            }

            removedSecurityQuestions.push(securityQuestion.id);

            securityQuestions.remove(securityQuestion.id);
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        onMounted(() =>
        {
            allSecurityQuestions = JSON.parse(JSON.stringify(passwordState.value.q));
            setSecurityQuestionModels();

            groupOptions.value = app.currentVault.groupStore.passwordGroups.map(g => 
            {
                const option: ObjectSelectOptionModel = 
                {
                    label: g.n,
                    backingObject: g,
                    icon: g.i,
                    color: g.c
                };

                return option
            });

            OH.forEachKey(passwordState.value.g, (k) => 
            {
                const group = app.currentVault.groupStore.passwordGroupsByID[k];
                if (!group)
                {
                    return;
                }

                selectedGroups.value.push({
                    label: group.n,
                    backingObject: group,
                    icon: group.i,
                    color: group.c
                });
            });

            if (!props.creating)
            {
                passwordState.value = pendingStoreState.proxifyObject("dataTypesByID.dataType", passwordState.value, passwordState.value.id);
            }
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
