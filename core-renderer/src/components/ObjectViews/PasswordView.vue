<template>
    <ObjectView :title="'Password'" :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition" :hideButtons="readOnly" :isSensitive="true">
        <VaulticFieldset>
            <TextInputField class="passwordView__passwordFor passwordView__inputField" :color="color" :label="'Password For'"
                v-model="passwordState.f" :maxWidth="''" :maxHeight="''" />
            <TextInputField class="passwordView__username passwordView__inputField" :color="color" :label="'Username'" v-model="passwordState.l"
                :width="'50%'" :maxWidth="''" :maxHeight="''" />
        </VaulticFieldset>
        <VaulticFieldset>
            <EncryptedInputField ref="passwordInputField" class="passwordView__password passwordView__inputField" :colorModel="colorModel"
                :label="'Password'" v-model="passwordState.p" :isInitiallyEncrypted="isInitiallyEncrypted" 
                :showRandom="true" :showUnlock="true" :required="true"
                showCopy="true" :width="'50%'" :maxWidth="''" :maxHeight="''" @onDirty="passwordIsDirty = true" />
            <TextInputField class="passwordView__domain passwordView__inputField" :inputGroupAddon="'www'" :color="color" 
                :label="'Domain'" v-model="passwordState.d" :showToolTip="true" :additionalValidationFunction="validateDomain"
                :toolTipMessage="'Domain is used to search for Breached Passwords. An example is facebook.com'"
                :toolTipSize="'clamp(15px, 1vw, 28px)'" :width="'50%'" :maxWidth="''" :maxHeight="''" />
        </VaulticFieldset>
        <VaulticFieldset>
            <TextInputField ref="emailField" class="passwordView__email passwordView__inputField" :color="color" :label="'Email'" v-model="passwordState.e"
                :width="'50%'" :isEmailField="true" :maxWidth="''" :maxHeight="''" />
            <ObjectMultiSelect :label="'Groups'" class="passwordView__inputField" :color="color" v-model="selectedGroups" :options="groupOptions" :width="'50%'" 
                :maxWidth="''" :maxHeight="''" />
        </VaulticFieldset>
        <VaulticFieldset :fillSpace="true" :static="true">
            <TextAreaInputField class="passwordView__additionalInformation passwordView__inputField" :colorModel="colorModel"
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
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted, Reactive, reactive, inject } from 'vue';

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
import { EncryptedInputFieldComponent, InputComponent, TableTemplateComponent } from '../../Types/Components';
import { uniqueIDGenerator } from '@vaultic/shared/Utilities/UniqueIDGenerator';
import { OH } from '@vaultic/shared/Utilities/PropertyManagers';
import { DictionaryAsList } from '@vaultic/shared/Types/Stores';
import { UpdatePasswordResponse } from '../../Objects/Stores/PasswordStore';

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
        const emailField: Ref<InputComponent | null> = ref(null);

        let pendingStoreState = app.currentVault.passwordStore.getPendingState()!;
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const refreshKey: Ref<string> = ref("");
        const passwordState: Reactive<Password> = props.creating ? reactive(props.model) : pendingStoreState.createCustomRef('dataTypesByID.dataType', props.model, props.model.id);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.p.p);
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(color.value));

        const isInitiallyEncrypted: Ref<boolean> = ref(!props.creating);
                
        const passwordIsDirty: Ref<boolean> = ref(false);
                    
        let allSecurityQuestions: { [key: string]: SecurityQuestion } = {};
        let addedSecurityQuestions: SecurityQuestion[] = [];
        let removedSecurityQuestions: string[] = [];
        let dirtySecurityQuestionQuestions: SecurityQuestion[] = [];
        let dirtySecurityQuestionAnswers: SecurityQuestion[] = [];
                    
        const securityQuestions: SortedCollection = new SortedCollection([], () => allSecurityQuestions);
        const locked: Ref<boolean> = ref(!props.creating);

        const selectedGroups: Ref<ObjectSelectOptionModel[]> = ref(getSelectedGroups());
        const groupOptions: Ref<ObjectSelectOptionModel[]> = ref([]);

        const readOnly: Ref<boolean> = ref(app.currentVault.isReadOnly.value);

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

        // mainly want to prevent '_' since users could use it to override prototypes on objects
        // with '__proto__'.
        const disallowedCharacters = /[ `!@#$%^&*()_+\-=[\]{};':"\\|,<>?~]/;
        function validateDomain(value: string): [boolean, string]
        {
            if (disallowedCharacters.test(value))
            {
                return [false, "Please enter a valid domain"];
            }

            return [true, ""];
        }

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
            app.popups.showRequestAuthentication(color.value, onAuthenticationSuccessful, onAuthenticationCanceled, true);

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
                    passwordState.g[g.backingObject!.id] = true;
                });

                if (await app.currentVault.passwordStore.addPassword(key, passwordState, addedSecurityQuestions, 
                    pendingStoreState))
                {
                    reset()
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

                app.runAsAsyncProcess(async () =>
                {
                    const result = await app.currentVault.passwordStore.updatePassword(key,
                        passwordState, passwordIsDirty.value, addedSecurityQuestions, dirtySecurityQuestionQuestions,
                        dirtySecurityQuestionAnswers, removedSecurityQuestions, newGroups, pendingStoreState);
    
                    if (result == UpdatePasswordResponse.EmailIsTaken)
                    {
                        emailField.value?.invalidate("Email is already in use");
                        app.popups.hideLoadingIndicator();
                    }
                    else
                    {
                        handleSaveResponse(result == UpdatePasswordResponse.Success);
                    }              
                });
            }
        }

        function reset()
        {
            // This won't track changes within the pending store since we didn't re create the 
            // custom ref but that's ok since we are creating
            Object.assign(passwordState, defaultPassword());
            pendingStoreState = app.currentVault.passwordStore.getPendingState()!;

            securityQuestions.updateValues([]);

            allSecurityQuestions = {};
            addedSecurityQuestions = [];
            removedSecurityQuestions = [];
            dirtySecurityQuestionAnswers = [];
            dirtySecurityQuestionQuestions = [];

            selectedGroups.value = [];
            refreshKey.value = Date.now().toString();
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
            }
            // Don't want to count this as a delete since it was never offically added
            else
            {
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
            }

            securityQuestions.remove(securityQuestion.id);
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function getSelectedGroups()
        {
            const selected: ObjectSelectOptionModel[] = [];
            OH.forEachKey(passwordState.g, (k) => 
            {
                const group = app.currentVault.groupStore.passwordGroupsByID[k];
                if (!group)
                {
                    return;
                }

                selected.push({
                    id: group.id,
                    label: group.n,
                    backingObject: group,
                    icon: group.i,
                    color: group.c
                });
            });

            return selected;
        }

        onMounted(() =>
        {
            allSecurityQuestions = JSON.parse(JSON.stringify(passwordState.q));
            setSecurityQuestionModels();

            groupOptions.value = app.currentVault.groupStore.passwordGroups.map(g => 
            {
                const option: ObjectSelectOptionModel = 
                {
                    id: g.id,
                    label: g.n,
                    backingObject: g,
                    icon: g.i,
                    color: g.c
                };

                return option
            });
        });

        return {
            passwordInputField,
            emailField,
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
            readOnly,
            onAuthenticationSuccessful,
            onAuthenticationCanceled,
            onSave,
            onAddSecurityQuestion,
            onQuestionDirty,
            onAnswerDirty,
            onDeleteSecurityQuestion,
            validateDomain
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

.passwordView__inputField {
    width: 50% !important;
}

@media (max-width: 850px) {
    #passwordView__table {
        position: relative;
        width: 100%;
    }

    .passwordView__additionalInformation {
        min-height: 300px !important;
    }

    .passwordView__additionalInformation,
    .passwordView__inputField {
        width: 100% !important;
    }
}
</style>
