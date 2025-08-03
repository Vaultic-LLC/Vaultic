<template>
    <div class="aboutPopupHeader">
        <TableSelector class="aboutPopupHeader__controls"
            :singleSelectorItems="[featuresTableControl, infoTableControl]" />
    </div>
    <div class="aboutPopupContainer">
        <Transition name="fade" mode="out-in">
            <ObjectView v-if="activeSection == 0" :color="primaryColor" :hideButtons="true">
                <VaulticAccordion :value="'0'">
                    <VaulticAccordionPanel :value="'0'">
                        <VaulticAccordionHeader :title="'Account'" />
                        <VaulticAccordionContent>
                            <div class="aboutPopupContainer__section">
                                <h2 class="aboutPopupContainer__section__header">Update Email</h2>
                                <div class="aboutPopupContainer__section__text">
                                    To update your email, simply update the email for the 'Vaultic Password Manager' password in your password table. Note, you can
                                    only do this while online.
                                </div>
                            </div>
                        </VaulticAccordionContent>
                    </VaulticAccordionPanel>
                    <VaulticAccordionPanel :value="'1'">
                        <VaulticAccordionHeader :title="'Shortcuts'" />
                        <VaulticAccordionContent>
                            <div class="aboutPopupContainer__section">
                                <h2 class="aboutPopupContainer__section__header">Right Click</h2>
                                <div class="aboutPopupContainer__section__text">
                                    Right click on any text table cell or input field to copy the value to your clip board
                                </div>
                            </div>
                        </VaulticAccordionContent>
                    </VaulticAccordionPanel>
                    <VaulticAccordionPanel :value="'2'">
                        <VaulticAccordionHeader :title="'Widgets'" />
                        <VaulticAccordionContent>
                            <div class="aboutPopupContainer__section">
                                <h2 class="aboutPopupContainer__section__header">Metrics</h2>
                                <div class="aboutPopupContainer__section__text">
                                    The Metric Gauges track important information about your data, but they also act as Filters. Upon clicking one,
                                    only those specific records will be shown in its respective table allowing you to easily identify and fix them
                                </div>
                            </div>
                            <div class="aboutPopupContainer__section">
                                <h2 class="aboutPopupContainer__section__header">Searching</h2>
                                <div class="aboutPopupContainer__section__text">
                                    Searching allows you to quickly find a record by one of its values. Searching is only done on the field that is currently being
                                    sorted on. If you want to search on another field, you'll first have to change which field you are sorting on.
                                </div>
                            </div>
                            <div class="aboutPopupContainer__section">
                                <h2 class="aboutPopupContainer__section__header">Graph Target</h2>
                                <div class="aboutPopupContainer__section__text">
                                    Knowing how secure all your Passwords and Values should be is important. By default, the target
                                    line on
                                    the Password or Value Graph is turned off but, you can toggle
                                    it on by clicking on the Target Legend Icon.
                                </div>
                            </div>
                        </VaulticAccordionContent>
                    </VaulticAccordionPanel>
                    <VaulticAccordionPanel :value="'3'" :final="true">
                        <VaulticAccordionHeader :title="'Sharing'" />
                        <VaulticAccordionContent>
                            <div class="aboutPopupContainer__section">
                                <h2 class="aboutPopupContainer__section__header">Icons</h2>
                                <div class="aboutPopupContainer__section__text">
                                    There are two different sharing Icons, <IonIcon :name="'cloud-upload-outline'" /> and <IonIcon :name="'cloud-download-outline'" />. The former 
                                    one denotes Vaults that you are sharing with other Users, while the latter one denotes Vaults that other Users are sharing with you.
                                </div>
                            </div>
                            <div class="aboutPopupContainer__section">
                                <h2 class="aboutPopupContainer__section__header">Username</h2>
                                <div class="aboutPopupContainer__section__text">
                                    To keep your email hidden, a Username is used for sharing Vaults between Users. You can set your Username by going to the 
                                    Sharing section in your Settings. You must set a Username in order for other Users to be able to share data with you.
                                </div>
                            </div>
                        </VaulticAccordionContent>
                    </VaulticAccordionPanel>
                    <VaulticAccordionPanel :value="'4'">
                        <VaulticAccordionHeader :title="'Multifactor Authentication'" />
                        <VaulticAccordionContent>
                            <div class="aboutPopupContainer__section">
                                <h2 class="aboutPopupContainer__section__header">Setup</h2>
                                <div class="aboutPopupContainer__section__text">
                                    Before enabling Multifactor Authentication, you must first add your key into an Authenticator App on your mobile phone. 
                                    To do this, open up your phone's app store, search for 'Microsoft Authenticator', and download the first result. 
                                    Once it is done downloading, hit the '+' icon in the top right, and then click 'Other' for the type of account. The app should
                                    now be looking to scan a QR code. To find this code, simpily click on the 'User' section in the toggle on the bottom left of your 
                                    Vaultic Password Manager's dashboard, and then click on 'Show' in the 'MFA Key' section of your account widget, which is located in 
                                    the center of your dashboard. Now just scan the QR code you see on screen and done!
                                </div>
                            </div>
                        </VaulticAccordionContent>
                    </VaulticAccordionPanel>
                </VaulticAccordion>
            </ObjectView>
            <ObjectView v-else :color="primaryColor" :hideButtons="true">
                <div class="aboutPopupContainer__section">
                    <h2>Terms and Conditions</h2>
                    // link to terms and conditions on website
                </div>
                <div class="aboutPopupContainer__section">
                    <h2>Privacy Policy</h2>
                    // link to Privacy Policy on website
                </div>
                <div>
                    Copywrite
                </div>
                <div v-if="isOnline" class="aboutPopupContainer__section">
                    <h2 class="aboutPopupContainer__section__header">Report a Bug</h2>
                    <div class="aboutPopupContainer__reportBugSection">
                        <BasicTextAreaInpuField ref="bugDescriptionRef" :color="colorModel.color" :label="'Description'" v-model="bugDescription"
                            :width="'19vw'" :height="'15vh'" :minWidth="'216px'" :minHeight="'91px'"
                            :maxHeight="'203px'" :maxWidth="'19vw'" />
                        <PopupButton :color="primaryColor" :disabled="disableButtons" :text="'Report Bug'"
                            :width="'8vw'" :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'"
                            :maxHeight="'45px'" :fontSize="'clamp(13px, 1vw, 20px)'" @onClick="reportBug" />
                    </div>
                </div>
                <div class="aboutPopupContainer__section">
                    <h2 class="aboutPopupContainer__section__header">Reach out to Customer Support</h2>
                    <div class="aboutPopupContainer__section__text">
                        vaultic.help@outlook.com
                    </div>
                </div>
            </ObjectView>
        </Transition>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import TableSelector from '../TableSelector.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import PopupButton from '../InputFields/PopupButton.vue';
import ObjectView from '../ObjectViews/ObjectView.vue';
import VaulticAccordion from '../Accordion/VaulticAccordion.vue';
import VaulticAccordionPanel from '../Accordion/VaulticAccordionPanel.vue';
import VaulticAccordionHeader from '../Accordion/VaulticAccordionHeader.vue';
import VaulticAccordionContent from '../Accordion/VaulticAccordionContent.vue';
import IonIcon from '../Icons/IonIcon.vue';
import BasicTextAreaInpuField from '../InputFields/BasicTextAreaInpuField.vue';

import { InputColorModel, SingleSelectorItemModel, defaultInputColorModel } from '../../Types/Models';
import { defaultInputTextColor } from '../../Types/Colors';
import app from "../../Objects/Stores/AppStore";
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { api } from '../../API';
import { InputComponent } from '../../Types/Components';

export default defineComponent({
    name: "AboutPopup",
    components:
    {
        TableSelector,
        TextAreaInputField,
        PopupButton,
        ObjectView,
        VaulticAccordion,
        VaulticAccordionPanel,
        VaulticAccordionHeader,
        VaulticAccordionContent,
        IonIcon,
        BasicTextAreaInpuField
    },
    setup()
    {
        const bugDescriptionRef: Ref<InputComponent | null> = ref(null);
        const activeSection: Ref<number> = ref(0);
        const scrollbarColor: Ref<string> = ref('#0f111d');
        const primaryColor: Ref<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const bugDescription: Ref<string> = ref('');
        const colorModel: Ref<InputColorModel> = ref(defaultInputColorModel(primaryColor.value));

        const disableButtons: Ref<boolean> = ref(false);
        const isOnline: ComputedRef<boolean> = computed(() => app.isOnline);

        const featuresTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
        {
            return {
                title: ref("Additional Features"),
                color: ref(app.userPreferences.currentPrimaryColor.value),
                isActive: computed(() => activeSection.value == 0),
                onClick: () => { activeSection.value = 0; }
            }
        });

        const infoTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
        {
            return {
                title: ref("Info"),
                color: ref(app.userPreferences.currentPrimaryColor.value),
                isActive: computed(() => activeSection.value == 1),
                onClick: () => { activeSection.value = 1; }
            }
        });

        async function reportBug()
        {
            if (!app.isOnline)
            {
                return;
            }

            if (!bugDescription.value)
            {
                bugDescriptionRef.value?.invalidate("Please enter a description");
                return;
            }

            app.popups.showLoadingIndicator(primaryColor.value, "Reporting Bug");
            const response = await api.server.user.reportBug(bugDescription.value);
            app.popups.hideLoadingIndicator();

            if (response.Success)
            {
                app.popups.showToast("Reported Bug", true);
                bugDescription.value = "";
            }
            else
            {
                defaultHandleFailedResponse(response);
            }
        }

        return {
            bugDescriptionRef,
            featuresTableControl,
            infoTableControl,
            activeSection,
            defaultInputTextColor,
            scrollbarColor,
            primaryColor,
            bugDescription,
            colorModel,
            disableButtons,
            isOnline,
            reportBug
        }
    }
})
</script>

<style>
.aboutPopupHeader {
    width: 100%;
}

.aboutPopupHeader__controls {
    left: 50%;
    transform: translateX(-50%);
    top: 0%;
    width: 40%;
    z-index: 10;
}

.aboutPopupContainer {
    position: absolute;
    top: 10%;
    width: 100%;
    height: 95%;
}

.aboutPopupContainer__sections {
    position: relative;
    color: v-bind(defaultInputTextColor);
    /* margin: clamp(10px, 5vw, 20px); */
    margin-left: auto;
    margin-right: auto;
    margin-top: 0;
    width: 90%;
    height: 90%;
    padding: 5px;
}

.aboutPopupContainer__section {
    margin-bottom: clamp(30px, 3vw, 50px);
}

.aboutPopupContainer__section__header {
    font-size: clamp(15px, 1vw, 25px);
    margin-bottom: 20px;
}

.aboutPopupContainer__section__text {
    font-size: clamp(10px, 0.8vw, 15px)
}

.aboutPopupContainer__image {
    border-radius: min(1vw, 1rem);
    transform: scale(0.75);
}

.aboutPopupContainer__reportBugSection {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    row-gap: 25px;
}

.aboutPopupContainer__storingMultifactorAuthKeysSection {
    height: 50%;
    margin-top: 2%;
}

.aboutPopupContainer__pickMFAKeyImage {
    position: absolute;
    left: 0;
    width: 20vw;
    height: 11vw;
    min-width: 170px;
}

.aboutPopupContainer__selectRowImage {
    position: absolute;
    left: 25%;
    width: 25vw;
    height: 11vw;
}

.aboutPopupContainer__qrCodeImage {
    position: absolute;
    left: 63%;
    width: 20vw;
    height: 11vw;
}

.aboutPopupContainer__metricsImage {
    position: absolute;
    left: 5%;
    width: 25vw;
    height: 13vw;
}

.aboutPopupContainer__hoverAtRiskIconImage {
    position: absolute;
    left: 47%;
    width: 25vw;
    height: 13vw;
}

.aboutPopupContainer__clickingOnHeaderImage {
    position: absolute;
    left: 0;
    width: 20vw;
    height: 11vw;
}

.aboutPopupContainer__searchingImage {
    position: absolute;
    left: 33%;
    width: 20vw;
    height: 11vw;
}

.aboutPopupContainer__searchedValueImage {
    position: absolute;
    left: 63%;
    width: 20vw;
    height: 11vw;
}

.aboutPopupContainer__graphHideTargetImage {
    position: absolute;
    left: 5%;
    width: 25vw;
    height: 13vw;
}

.aboutPopupContainer__graphShowTargetImage {
    position: absolute;
    left: 47%;
    width: 25vw;
    height: 13vw;
}
</style>
