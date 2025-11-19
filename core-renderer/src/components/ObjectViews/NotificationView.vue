<template>
    <div class="notificationView__header">
        <h2>Notifications</h2>
    </div>
    <div class="notificationView__content">
        <ScrollView v-if="notifications.length > 0" :color="color">
            <div class="notificationView__cardContainer">
                <Card v-for="(notification, i) in notifications" :key="i"
                    :pt="{
                        body: 'notificationView__cardBody',
                        caption: 'notificationView__cardCaption',
                        title: 'notificationView__cardTitle'
                    }">
                    <template #title>{{ notification.text }}</template>
                    <template #content>
                        <p class="notificationView__cardDescription">
                            {{ notification.description }}
                        </p>
                        <PopupButton v-if="notification.button" class="notificationView__cardButton" :width="'100px'" :height="'25px'" :minWidth="''" :minHeight="''" 
                            :text="notification.button.text" :color="color" @onClick="notification.button.onClick" />
                    </template>
                </Card>
            </div>
        </ScrollView>
        <div v-else class="notificationView__noNotifications">
            <div class="notificationView__noNotificationsText">You currently have no notifications</div>
        </div>
    </div>
</template>
<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import Card from 'primevue/card';
import PopupButton from '../InputFields/PopupButton.vue';
import ScrollView from './ScrollView.vue';

import { VaulticNotification } from '@vaultic/shared/Types/Props';
import app from '../../Objects/Stores/AppStore';

export default defineComponent({
    name: "NotificationView",
    components: 
    {
        Card,
        PopupButton,
        ScrollView,
    },
    props: ['notifications'],
    setup(props)
    {
        const color: ComputedRef<string> = computed(() => app.popups.color);
        const notifications: ComputedRef<VaulticNotification[]> = computed(() => props.notifications);
        
        return {
            color,
            notifications,
        };
    }
})
</script>

<style>
.notificationView__header {
    height: 5%;
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    font-size: clamp(15px, 1vw, 25px);
}

.notificationView__content {
	width: 80%;
	height: 82%;
    margin: auto;
    margin-top: 7%;
}

.notificationView__cardContainer {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.notificationView__cardBody {
    padding: clamp(12px, 1vw, 20px) !important;
}

.notificationView__cardCaption {
    text-align: center !important;
}

.notificationView__cardTitle {
    font-size: clamp(15px, 1vw, 20px) !important;
}

.notificationView__cardDescription {
    text-align: center !important;
    margin: 0 !important;
}

.notificationView__cardButton {
    margin: auto;
    margin-top: 20px;
}
</style>
