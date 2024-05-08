<template>
    <div ref="container" class="dropDownContainer" :tabindex="0" @click="onSelectorClick" @focus="focused = true"
        @blur="unFocus" :class="{ active: active, opened: opened, shouldFadeIn: fadeIn }" @keyup.up="onKeyUp"
        @keyup.down="onKeyDown" @keyup.enter="onEnter">
        <div class="dropDownTitle">
            <label class="dropDownLabel">{{ label }}</label>
            <div class="dropDownIcon" :class="{ opened: opened }">
                <ion-icon :style="{ visibility: 'unset' }" :class="{ active: active }"
                    name="chevron-down-circle-outline"></ion-icon>
            </div>
            <label class="selectedItemText" :class="{ hasValue: selectedValue != '' }"> {{ selectedValue }}</label>
        </div>
        <div class="dropDownSelect" :class="{ opened: opened }">
            <option class="dropDownSelectOption" :class="{ active: focusedIndex == -1 }" @mouseover="focusedIndex = -1"
                @click="onOptionClick({ displayName: '', backingProperty: '', type: 0 })">
            </option>
            <option class="dropDownSelectOption" :class="{ active: focusedIndex == index }"
                v-for="(df, index) in displayFieldOptions" :key="index" @click="onOptionClick(df)"
                @mouseover="focusedIndex = index">
                {{ df.displayName }}</option>
        </div>
        <input class="dropDownInput" type="text" />
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref } from 'vue';

import { appHexColor, widgetInputLabelBackgroundHexColor } from '@renderer/Constants/Colors';
import { PropertySelectorDisplayFields, PropertyType } from '../../Types/EncryptedData';
import { ValidationFunctionsKey } from '@renderer/Types/Keys';
import tippy from 'tippy.js';

export default defineComponent({
    name: "PropertySelectorInputField",
    emits: ["update:modelValue", "propertyTypeChanged"],
    props: ["modelValue", "displayFieldOptions", "label", "color", 'isOnWidget', 'fadeIn', 'height', 'minHeight', 'maxHeight',
        'width', 'minWidth', 'maxWidth'],
    setup(props, ctx)
    {
        const container: Ref<HTMLElement | null> = ref(null);
        let selectedValue: Ref<string> = ref(props.modelValue);
        let opened: Ref<boolean> = ref(false);
        let focused: Ref<boolean> = ref(false);
        let active: ComputedRef<boolean> = computed(() => !!selectedValue.value || opened.value || focused.value);
        let selectedPropertyType: PropertyType = PropertyType.String;
        const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

        const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
        let tippyInstance: any = null;

        const displayFieldCount: Ref<number> = ref(Object.keys(props.displayFieldOptions).length - 1);
        const focusedIndex: Ref<number> = ref(-1);

        function onSelectorClick()
        {
            opened.value = !opened.value;
        }

        function onOptionClick(df: PropertySelectorDisplayFields)
        {
            selectedValue.value = df.displayName;
            ctx.emit('update:modelValue', df.backingProperty);

            if (df.type != selectedPropertyType)
            {
                selectedPropertyType = df.type;
                if (selectedPropertyType == PropertyType.Enum)
                {
                    ctx.emit("propertyTypeChanged", selectedPropertyType, df.enum);
                }
                else
                {
                    ctx.emit("propertyTypeChanged", selectedPropertyType);
                }
            }

            focused.value = false;
        }

        function onEnter()
        {
            if (!opened.value)
            {
                opened.value = true;
            }
            else
            {
                opened.value = false;
                onOptionClick(props.displayFieldOptions[focusedIndex.value]);
                if (selectedValue.value == "")
                {
                    focused.value = false;
                }
            }
        }

        function validate()
        {
            if (selectedValue.value == '' || selectedValue.value == undefined)
            {
                invalidate("Please select a value");
                return false;
            }

            return true;
        }

        function invalidate(message: string)
        {
            tippyInstance.setContent(message);
            tippyInstance.show();
        }

        function onKeyUp()
        {
            focusedIndex.value = Math.max(-1, focusedIndex.value - 1);
        }

        function onKeyDown()
        {
            focusedIndex.value = Math.min(displayFieldCount.value, focusedIndex.value + 1)
        }


        function unFocus()
        {
            opened.value = false;
            focused.value = false;
        }

        onMounted(() =>
        {
            if (props.modelValue)
            {
                const property = (props.displayFieldOptions as PropertySelectorDisplayFields[]).filter(p => p.backingProperty == props.modelValue);
                if (property.length != 1)
                {
                    selectedValue.value = "";
                }
                else
                {
                    selectedValue.value = property[0].displayName;
                }
            }

            if (!container.value)
            {
                return;
            }

            validationFunction?.value.push(validate);
            tippyInstance = tippy(container.value, {
                inertia: true,
                animation: 'scale',
                theme: 'material',
                placement: "bottom-start",
                trigger: 'manual',
                hideOnClick: false
            });
        });

        onUnmounted(() =>
        {
            tippyInstance.hide();
            validationFunction?.value.splice(validationFunction?.value.indexOf(validate), 1);
        });

        return {
            opened,
            active,
            selectedValue,
            backgroundColor,
            container,
            focusedIndex,
            displayFieldCount,
            focused,
            onSelectorClick,
            onOptionClick,
            onKeyUp,
            onKeyDown,
            unFocus,
            onEnter
        }
    }
})
</script>

<style scoped>
.dropDownContainer {
    position: relative;
    height: v-bind(height);
    width: v-bind(width);
    max-height: v-bind(maxHeight);
    max-width: v-bind(maxWidth);
    min-height: v-bind(minHeight);
    min-width: v-bind(minWidth);

    border: solid 1.5px #9e9e9e;
    border-radius: var(--responsive-border-radius);
    background: none;
    color: white;
    transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);

    cursor: pointer;
    outline: none;
}

.dropDownContainer.shouldFadeIn {
    opacity: 0;
    animation: fadeIn 1s linear forwards;
}

.dropDownContainer.active {
    border: 1.5px solid v-bind(color);
}

.dropDownContainer.opened {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
}

.dropDownContainer .dropDownTitle .dropDownLabel {
    position: absolute;
    top: 30%;
    left: var(--input-label-left);
    transition: var(--input-label-transition);
    cursor: pointer;
    font-size: clamp(11px, 1.2vh, 25px);
    will-change: transform;
}

.dropDownContainer.active .dropDownTitle .dropDownLabel {
    transform-origin: left;
    transform: translateY(-150%) scale(0.8);
    background-color: v-bind(backgroundColor);
    padding: 0 .2em;
    color: v-bind(color);
    font-size: clamp(11px, 1.2vh, 25px);
}

.dropDownContainer .dropDownTitle .dropDownIcon {
    position: absolute;
    top: 30%;
    right: 5%;
    font-size: clamp(15px, 2vh, 25px);
    color: white;
    transition: 0.3s;
    transform: rotate(0);
    display: flex;
    justify-content: center;
    align-items: center;
}

.dropDownContainer .dropDownTitle .dropDownIcon.opened {
    transform: rotate(180deg);
}

.dropDownContainer .dropDownTitle .dropDownIcon .active {
    color: v-bind(color);
}

.dropDownContainer .dropDownTitle .selectedItemText {
    display: none;
    color: white;
    font-size: clamp(11px, 1.2vh, 25px);
}

.dropDownContainer .dropDownTitle .selectedItemText.hasValue {
    display: block;
    position: absolute;
    top: 30%;
    left: 5%;
    transition: var(--input-label-transition);
}

.dropDownContainer .dropDownSelect {
    width: 100%;
    position: absolute;
    left: 0;
    bottom: 0;
    background: none;
    font-size: clamp(11px, 1.2vh, 25px);
    color: white;
    transform: translate(-1.5px, 100%);
    border-bottom-left-radius: 1rem;
    border-bottom-right-radius: 1rem;
    z-index: -1;
    transition: opacity 0.3s;
    opacity: 0;
}

.dropDownSelect.opened {
    border-left: 1.5px solid v-bind(color);
    border-right: 1.5px solid v-bind(color);
    border-bottom: 1.5px solid v-bind(color);
    opacity: 1;
}

.dropDownContainer .dropDownSelect:focus,
.dropDownContainer .dropDownSelect:active {
    outline: none;
}

.dropDownSelect .dropDownSelectOption {
    display: none;
    background-color: v-bind(backgroundColor);
    font-size: clamp(11px, 1.2vh, 25px);
}

.dropDownSelect.opened .dropDownSelectOption {
    display: block;
    text-align: left;
    padding-left: 10px;
    transition: 0.15s;
}

.dropDownSelect.opened .dropDownSelectOption:last-child {
    border-bottom-left-radius: 1rem;
    border-bottom-right-radius: 1rem;
}

.dropDownSelect.opened .dropDownSelectOption:hover,
.dropDownSelect.opened .dropDownSelectOption.active {
    background-color: grey;
}

.dropDownInput {
    position: absolute;
    display: none;
}
</style>
