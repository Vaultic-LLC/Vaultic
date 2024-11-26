<template>
    <div class="textAreaInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
        <Editor v-model="placeholderValue" :dt="toolbarStyle" @update:modelValue="onInput">
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
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { InputColorModel } from '../../Types/Models';

import Editor from 'primevue/editor';

export default defineComponent({
    name: "TextAreaInputField",
    components:
    {
        Editor
    },
    emits: ["update:modelValue"],
    props: ["modelValue", "label", "colorModel", "fadeIn", "isOnWidget", "width",
        'minWidth', 'maxWidth', "height", 'minHeight', 'maxHeight'],
    setup(props, ctx)
    {
        const placeholderValue: Ref<string> = ref(props.modelValue);

        const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);
        const colorModel: ComputedRef<InputColorModel> = computed(() => props.colorModel);

        const textAreaWidth: ComputedRef<string> = computed(() => props.width ?? "400px");
        const textAreaHeight: ComputedRef<string> = computed(() => props.height ?? "200px");

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

        return {
            toolbarStyle,
            placeholderValue,
            shouldFadeIn,
            defaultInputColor,
            defaultInputTextColor,
            textAreaWidth,
            textAreaHeight,
            colorModel,
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
</style>
