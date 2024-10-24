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
            :height="'15vh'" :minWidth="'216px'" :minHeight="'91px'" :maxHeight="'203px'" :isEditing="!creating" />
        <TableTemplate ref="tableRef" :color="color" id="passwordView__table" class="scrollbar" :scrollbar-size="1"
            :headerModels="groupHeaderModels" :border="true" :row-gap="0" :emptyMessage="emptyMessage"
            :showEmptyMessage="showEmptyMessage" :headerTabs="headerTabs" :headerHeight="'clamp(45px, 5.8vh, 80px)'"
            :initialPaddingRow="activeTab == 1" @scrolled-to-bottom="scrolledToBottom">
            <template #headerControls>
                <Transition name="fade" mode="out-in">
                    <div v-if="activeTab == 0" class="passwordViewTableHeaderControls">
                        <UnlockButton v-if="locked" :color="color" @onAuthSuccessful="locked = false" />
                        <AddButton :color="color" @click="onAddSecurityQuestion" />
                    </div>
                    <SearchBar v-else v-model="searchText" :color="color" :width="'8vw'" :maxWidth="'250px'"
                        :minWidth="'100px'" :minHeight="'27px'" />
                </Transition>
            </template>
            <template #body>
                <SecurityQuestionRow v-if="activeTab == 0" v-for="(sq, index) in passwordState.securityQuestions.value"
                    :key="sq.id.value" :rowNumber="index" :colorModel="colorModel" :model="sq" :disabled="false"
                    :hideInitialRow="true" :moveButtonsToBottomRatio="1" @onQuesitonDirty="onQuestionDirty(sq.id.value)"
                    @onAnswerDirty="onAnswerDirty(sq.id.value)" @onDelete="onDeleteSecurityQuestion(sq.id.value)"
                    :isInitiallyEncrypted="sq.question != ''" />
                <SelectableTableRow v-else v-for="(trd, index) in groupModels.visualValues" class="hover" :key="trd.id"
                    :rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false" :color="color" />
            </template>
        </TableTemplate>
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted, provide, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import SearchBar from '../Table/Controls/SearchBar.vue';
import SelectableTableRow from '../Table/Rows/SelectableTableRow.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import AddButton from '../Table/Controls/AddButton.vue';
import SecurityQuestionRow from '../Table/Rows/SecurityQuestionRow.vue';
import UnlockButton from "../UnlockButton.vue"
import ToolTip from '../ToolTip.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';

import { Password, Group, defaultPassword } from '../../Types/DataTypes';
import { GridDefinition, HeaderTabModel, InputColorModel, SelectableTableRowData, SortableHeaderModel, defaultInputColorModel } from '../../Types/Models';
import { createSortableHeaderModels, getEmptyTableMessage, getObjectPopupEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import app from "../../Objects/Stores/AppStore";
import { generateUniqueID } from '../../Helpers/generatorHelper';
import { EncryptedInputFieldComponent, TableTemplateComponent } from '../../Types/Components';
import { api } from "../../API"
import { DirtySecurityQuestionQuestionsKey, DirtySecurityQuestionAnswersKey } from '../../Constants/Keys';
import { Field, HeaderDisplayField } from '../../Types/Fields';

export default defineComponent({
    name: "PasswordView",
    components: {
        ObjectView,
        TextInputField,
        EncryptedInputField,
        TextAreaInputField,
        SearchBar,
        TableTemplate,
        AddButton,
        SelectableTableRow,
        SecurityQuestionRow,
        UnlockButton,
        ToolTip,
        CheckboxInputField
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const passwordInputField: Ref<EncryptedInputFieldComponent | null> = ref(null);

        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const refreshKey: Ref<string> = ref("");
        const passwordState: Ref<Password> = ref(props.model);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.passwordsColor.primaryColor);
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(color.value));

        // @ts-ignore
        const groups: Ref<SortedCollection<Group>> = ref(new SortedCollection<Group>(app.currentVault.groupStore.passwordGroups, "name"));
        // @ts-ignore
        const groupModels: Ref<InfiniteScrollCollection<SelectableTableRowData>> = ref(new InfiniteScrollCollection<SelectableTableRowData>());
        const initalLength: Ref<number> = ref(passwordState.value.passwordLength.value ?? 0);
        const isInitiallyEncrypted: Ref<boolean> = ref(!props.creating);

        const passwordIsDirty: Ref<boolean> = ref(false);
        const dirtySecurityQuestionQuestions: Ref<string[]> = ref([]);
        const dirtySecurityQuestionAnswers: Ref<string[]> = ref([]);

        const locked: Ref<boolean> = ref(!props.creating);

        const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));

        provide(DirtySecurityQuestionQuestionsKey, dirtySecurityQuestionQuestions);
        provide(DirtySecurityQuestionAnswersKey, dirtySecurityQuestionAnswers);

        const gridDefinition: GridDefinition = {
            rows: 1,
            rowHeight: '100%',
            columns: 1,
            columnWidth: '100%'
        }

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const showEmptyMessage: ComputedRef<boolean> = computed(() =>
            (activeTab.value == 0 && passwordState.value.securityQuestions.value.length == 0) ||
            (activeTab.value == 1 && groupModels.value.visualValues.length == 0));

        const emptyMessage: ComputedRef<string> = computed(() =>
        {
            if (activeTab.value == 0)
            {
                return getEmptyTableMessage("Security Questions");
            }

            return getObjectPopupEmptyTableMessage("Groups", "Password", "Group", props.creating);
        });

        const activeGroupHeader: Ref<number> = ref(1);
        const groupHeaderDisplayFields: HeaderDisplayField[] = [
            {
                backingProperty: "",
                displayName: " ",
                width: 'clamp(25px, 4vw, 100px)',
                clickable: true
            },
            {
                backingProperty: "name",
                displayName: "Name",
                width: 'clamp(80px, 6vw, 150px)',
                clickable: true
            },
            {
                displayName: "Color",
                backingProperty: "color",
                width: 'clamp(50px, 4vw, 100px)',
                clickable: true
            }
        ];

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

        // @ts-ignore
        const groupHeaderModels: ComputedRef<SortableHeaderModel[]> = computed(() =>
        {
            if (activeTab.value == 0)
            {
                // don't need headers for security questions
                return [];
            }

            return createSortableHeaderModels<Group>(
                activeGroupHeader, groupHeaderDisplayFields, groups.value, undefined, setGroupModels);
        });

        function setGroupModels()
        {
            const pendingRows = groups.value.calculatedValues.map(async g =>
            {
                const values: any[] =
                    [
                        {
                            component: "TableRowTextValue",
                            value: g.name,
                            copiable: false,
                            width: 'clamp(80px, 6vw, 150px)'
                        },
                        {
                            component: "TableRowColorValue",
                            color: g.color,
                            copiable: true,
                            width: 'clamp(50px, 4vw, 100px)',
                            margin: false
                        }
                    ];

                const id = await api.utilities.generator.uniqueId();
                const model: SelectableTableRowData = {
                    id: id,
                    key: g.id.value,
                    values: values,
                    isActive: ref(passwordState.value.groups.value.includes(g.id.value)),
                    selectable: true,
                    onClick: async function ()
                    {
                        if (passwordState.value.groups.value.includes(g.id.value))
                        {
                            passwordState.value.groups.value = passwordState.value.groups.value.filter(id => id != g.id.value);
                        }
                        else
                        {
                            passwordState.value.groups.value.push(g.id.value);
                        }
                    }
                }
                return model;
            });

            Promise.all(pendingRows).then((rows) =>
            {
                groupModels.value.setValues(rows);
                if (tableRef.value)
                {
                    // @ts-ignore
                    tableRef.value.scrollToTop();
                    setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
                }
            });
        }

        function onSave()
        {
            passwordInputField.value?.toggleHidden(true);
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
            passwordState.value.securityQuestions.value.push({
                id: new Field(await generateUniqueID(passwordState.value.securityQuestions.value)),
                question: '',
                questionLength: 0,
                answer: '',
                answerLength: 0
            });

            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function onQuestionDirty(id: string)
        {
            if (!dirtySecurityQuestionQuestions.value.includes(id))
            {
                dirtySecurityQuestionQuestions.value.push(id);
            }
        }

        function onAnswerDirty(id: string)
        {
            if (!dirtySecurityQuestionAnswers.value.includes(id))
            {
                dirtySecurityQuestionAnswers.value.push(id);
            }
        }

        function onDeleteSecurityQuestion(id: string)
        {
            passwordState.value.securityQuestions.value = passwordState.value.securityQuestions.value.filter(sq => sq.id.value != id);

            if (dirtySecurityQuestionQuestions.value.includes(id))
            {
                dirtySecurityQuestionQuestions.value.splice(dirtySecurityQuestionQuestions.value.indexOf(id), 1);
            }

            if (dirtySecurityQuestionAnswers.value.includes(id))
            {
                dirtySecurityQuestionAnswers.value.splice(dirtySecurityQuestionAnswers.value.indexOf(id), 1);
            }

            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function scrolledToBottom()
        {
            if (activeTab.value == 0)
            {
                return;
            }

            groupModels.value.loadNextChunk();
        }

        onMounted(() =>
        {
            setGroupModels();
        });

        watch(() => searchText.value.value, (newValue) =>
        {
            groups.value.search(newValue);
            setGroupModels();
        });

        return {
            passwordInputField,
            color,
            groupHeaderModels,
            groupModels,
            passwordState,
            refreshKey,
            initalLength,
            isInitiallyEncrypted,
            passwordIsDirty,
            gridDefinition,
            searchText,
            activeTab,
            headerTabs,
            emptyMessage,
            showEmptyMessage,
            locked,
            colorModel,
            tableRef,
            onAuthenticationSuccessful,
            onAuthenticationCanceled,
            onSave,
            onAddSecurityQuestion,
            onQuestionDirty,
            onAnswerDirty,
            onDeleteSecurityQuestion,
            scrolledToBottom,
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
