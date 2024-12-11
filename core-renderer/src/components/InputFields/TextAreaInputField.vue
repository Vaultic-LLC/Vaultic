<template>
    <div class="textAreaInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
        <Panel :header="label" 
            :pt="{
                root: 'textAreaInputFieldContainer__panel',
                header: 'textAreaInputFieldContainer__panelHeader',
                title: 'textAreaInputFieldContainer__panelTitle',
                contentContainer: 'textAreaInputFieldContainer__panelContentContainer',
                content: 'textAreaInputFieldContainer__panelContent'
            }">
            <div class="textAreaInputFieldContainer__editorWrapper">
                <Editor ref="editorRef" v-model="placeholderValue" :dt="toolbarStyle" :editorStyle="'height: 100%'" 
                    @update:modelValue="onInput"
                    :pt="{
                        root: 'textAreaInputFieldContainer__editor',
                        content: 'textAreaInputFieldContainer__editorContent'
                    }">
                    <template v-slot:toolbar>
                        <span class="ql-formats">
                            <select class="ql-header"></select>
                        </span>
                        <span class="ql-formats">
                            <button class="ql-bold"></button>
                            <button class="ql-italic"></button>
                            <button class="ql-underline"></button>
                            <button class="ql-strike"></button>
                        </span>
                        <span class="ql-formats">
                            <select class="ql-color"></select>
                            <select class="ql-background"></select>
                        </span>
                        <span class="ql-formats">
                            <button class="ql-blockquote"></button>
                            <button class="ql-code-block"></button>
                        </span>
                        <span class="ql-formats">
                            <button class="ql-list" value="ordered"></button>
                            <button class="ql-list" value="bullet"></button>
                            <button class="ql-list" value="check"></button>
                        </span>
                        <span class="ql-formats">
                            <button class="ql-link"></button>
                            <button class="ql-formula"></button>
                        </span>
                        <span class="ql-formats">
                            <button class="ql-clean"></button>
                        </span>
                    </template>
                </Editor>
            </div>
        </Panel>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, onUnmounted, ref } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { InputColorModel } from '../../Types/Models';

import Editor from 'primevue/editor';
import Panel from 'primevue/panel';
import Fieldset from 'primevue/fieldset';

export default defineComponent({
    name: "TextAreaInputField",
    components:
    {
        Editor,
        Panel,
        Fieldset
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "label", "colorModel", "fadeIn", "isOnWidget", "width",
        'minWidth', 'maxWidth', "height", 'minHeight', 'maxHeight'],
    setup(props, ctx)
    {
        const editorRef: Ref<any> = ref();
        const resizeHandler: ResizeObserver = new ResizeObserver(setHeight);
        const placeholderValue: Ref<string> = ref(props.modelValue);

        const shouldFadeIn: ComputedRef<boolean> = computed(() => false);
        const colorModel: ComputedRef<InputColorModel> = computed(() => props.colorModel);

        const textAreaWidth: ComputedRef<string> = computed(() => props.width ?? "400px");
        const textAreaHeight: ComputedRef<string> = computed(() => props.height ?? "200px");

        const editorContentHeight: Ref<string> = ref('');

        const toolbarStyle = computed(() => 
        {
            return {
                toolbarItemActive: {
                    color: colorModel.value.color
                }
            }
        });

        async function onInput(value: string)
        {
            ctx.emit("update:modelValue", value);
        }

        function setHeight()
        {
            if (editorRef.value?.$el)
            {
                editorContentHeight.value = `${editorRef.value.$el.clientHeight * 0.9}px`;
            }
        }

        onMounted(() => 
        {
            const body = document.getElementById('body');
            if (body)
            {
                resizeHandler.observe(body)
            }

            setHeight();
        });

        onUnmounted(() => 
        {
            const body = document.getElementById('body');
            if (body)
            {
                resizeHandler.unobserve(body)
            }        
        });

        return {
            editorRef,
            toolbarStyle,
            placeholderValue,
            shouldFadeIn,
            defaultInputColor,
            defaultInputTextColor,
            textAreaWidth,
            textAreaHeight,
            colorModel,
            editorContentHeight,
            onInput,
        }
    }
})
</script>

<style scoped>
.textAreaInputFieldContainer {
    position: relative;
    height: v-bind(textAreaHeight);
    width: v-bind(textAreaWidth);
    min-height: v-bind(minHeight);
    min-width: v-bind(minWidth);
    max-height: v-bind(maxHeight);
    max-width: v-bind(maxWidth);
    display: flex;
}

.textAreaInputFieldContainer.fadeIn {
    opacity: 0;
    animation: fadeIn 1s linear forwards;
}

:deep(.textAreaInputFieldContainer__panel) {
    width: 100%;
}

:deep(.textAreaInputFieldContainer__panelHeader) {
    /* height: 10%; */
    padding: clamp(10px, 1vw, 18px) !important;
}

:deep(.textAreaInputFieldContainer__panelTitle) {
    font-size: clamp(10px, 1vw, 16px) !important;
}

:deep(.textAreaInputFieldContainer__panelContentContainer) {
    height: 90%;
}

:deep(.textAreaInputFieldContainer__panelContent) {
    height: 100%;
}

.textAreaInputFieldContainer__editorWrapper {
    height: 100%;
}

:deep(.textAreaInputFieldContainer__editor) {
    height: 100%;
}

:deep(.textAreaInputFieldContainer__editorContent){
    height: v-bind(editorContentHeight) !important;
}
</style>
