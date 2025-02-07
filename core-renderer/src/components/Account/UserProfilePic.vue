<template>
    <div class="userProfilePic">
        <div v-if="hasProfilePic">
        </div>
        <div class="userProfilePic__firstLastNamePic" v-else>
            <span>{{ firstLetter }}</span>
            <span>{{ secondLetter }}</span>
        </div>
    </div>
</template>

<script lang="ts">
import { IUser } from '@vaultic/shared/Types/Entities';
import { defineComponent, ComputedRef, computed, watch, Ref, ref } from 'vue';
import app from '../../Objects/Stores/AppStore';
import { getLinearGradientFromColor, hexToRgb } from '../../Helpers/ColorHelper';
import { tween } from '../../Helpers/TweenHelper';
import { RGBColor } from '../../Types/Colors';

export default defineComponent({
    name: "UserProfilePic",
    props: ['user', 'size', 'fontSize'],
    setup(props)
    {
        const linearGradient: Ref<string> = ref(getLinearGradientFromColor(app.userPreferences.currentPrimaryColor.value));
        const currentUser: ComputedRef<Partial<IUser>> = computed(() => props.user);
        const hasProfilePic: ComputedRef<boolean> = computed(() => false);
        const firstLetter: ComputedRef<string> = computed(() => currentUser.value?.firstName![0].toUpperCase() ?? "");
        const secondLetter: ComputedRef<string> = computed(() => currentUser.value?.lastName![0].toUpperCase() ?? "");

        watch(() => app.userPreferences.currentPrimaryColor.value, (newValue, oldValue) => 
        {
            const previousColor: RGBColor | null = hexToRgb(oldValue);
            const newColor: RGBColor | null = hexToRgb(newValue);

            tween(previousColor!, newColor!, 300, (object) => 
            {
                const rgb: string = `rgba(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)}, ${object.alpha})`;
                linearGradient.value = getLinearGradientFromColor(rgb);
            });
        });

        return {
            linearGradient,
            currentUser,
            hasProfilePic,
            firstLetter,
            secondLetter
        }
    }
})
</script>
<style>
.userProfilePic {
    width: v-bind(size);
    height: v-bind(size);
}

.userProfilePic__firstLastNamePic {
    background: v-bind(linearGradient);
    color: white;
    font-size: v-bind(fontSize);
    height: 100%;
    width: 100%;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    column-gap: 5%;
}
</style>
