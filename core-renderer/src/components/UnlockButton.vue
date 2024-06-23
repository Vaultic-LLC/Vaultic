<template>
    <div class="unlockButtonContainer" @click.stop="onClick">
        <div class="unlockButtonContainer__button">
            <ion-icon name="lock-open-outline"></ion-icon>
        </div>
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, inject, onMounted, onUnmounted, ref } from 'vue';

import { DecryptFunctionsKey, RequestAuthorizationKey } from '../Types/Keys';

export default defineComponent({
    name: "UnlockButton",
    props: ['color'],
    emits: ['onAuthSuccessful'],
    setup(_, ctx)
    {
        const requestAuthorization: Ref<boolean> = inject(RequestAuthorizationKey, ref(false));
        const decryptFunctions: Ref<{ (key: string): void }[]> | undefined = inject(DecryptFunctionsKey, ref([]));
        const transition: Ref<string> = ref('0');

        function onAuthSuccessful(_: string)
        {
            ctx.emit('onAuthSuccessful');
        }

        function onClick()
        {
            requestAuthorization.value = true;
        }

        onMounted(() =>
        {
            decryptFunctions.value.push(onAuthSuccessful);

            // used to fix bug where the icon will slowly grow when first rendered
            transition.value = '0.5s';
        });

        onUnmounted(() => decryptFunctions.value.splice(decryptFunctions.value.indexOf(onAuthSuccessful), 1));

        return {
            transition,
            onClick
        }
    }
})
</script>

<style>
.unlockButtonContainer {
    cursor: pointer;
}

.unlockButtonContainer__button {
    height: clamp(15px, 1.8vw, 35px);
    width: clamp(15px, 1.8vw, 35px);
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: clamp(12px, 1.2vw, 25px);
    border-radius: 50%;
    color: white;
    transition: v-bind(transition);
    border: 2px solid v-bind(color);
}

.unlockButtonContainer__button:hover {
    box-shadow: 0 0 25px v-bind(color);
}
</style>
