<template>
    <div class="mobileBreaches">
        <BreachedPasswords />
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import BreachedPasswords from '../BreachedPasswords/BreachedPasswords.vue';

export default defineComponent({
    name: 'MobileBreaches',
    components:
    {
        BreachedPasswords
    },
    setup()
    {
            
        return {

        }
    }
});
</script>

<style>
.mobileBreaches {
    flex-grow: 1;
}
</style>
