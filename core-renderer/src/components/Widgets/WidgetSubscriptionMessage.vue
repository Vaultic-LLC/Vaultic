<template>
    <div class="widgetSubscriptionMessage">
        <div>
            <i class="pi pi-exclamation-triangle widgetSubscriptionMessage__icon"></i>
        </div>
        <div>
            {{ message }}
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ComputedRef, computed } from 'vue';
import app from '../../Objects/Stores/AppStore';

export default defineComponent({
    name: "WidgetSubscriptionMessage",
    props: ['message'],
    setup()
    {
        const isOnline: ComputedRef<boolean> = computed(() => app.isOnline);
        const message: ComputedRef<string> = comptued(() => !isOnline ? "Please sign into Online Mode to view this Widget" : "")
        
        return {

        }
    }
})
</script>
<style>
.widgetSubscriptionMessage {
    width: 100%;
    height: 100%;
    display: flex;
    color: white;
    flex-direction: column;
    transform: translateY(10%);
}

.widgetSubscriptionMessage__icon {
    font-size: 50px !important;
}
</style>
