<template>
    <div class="aboutPopupHeader">
        <TableSelector class="aboutPopupHeader__controls"
            :singleSelectorItems="[featuresTableControl, infoTableControl]" />
    </div>
    <div class="aboutPopupContainer">
        <Transition name="fade" mode="out-in">
            <ScrollView v-if="activeSection == 0" class="aboutPopupContainer__sections" :color="primaryColor">
                <div class="aboutPopupContainer__section aboutPopupContainer__storingMultifactorAuthKeysSection">
                    <h2 class="aboutPopupContainer__section__header">Storing Multi Factor Authentication Keys</h2>
                    <div class="aboutPopupContainer__section__text">
                        It seems like almost everyone is using Multi Factor Authentication these days. Luckily, you can
                        easily store your MFA Key in case you ever need to re set it up. Simply creat a Value with Type
                        set to MFA Key and you'll be able to see the original QR Code in the Value Row
                    </div>
                    <div>
                        <img class="aboutPopupContainer__image aboutPopupContainer__pickMFAKeyImage"
                            src="../../assets/Files/pickMFAKey.png" />
                        <img class="aboutPopupContainer__image aboutPopupContainer__selectRowImage"
                            src="../../assets/Files/selectRow.png" />
                        <img class="aboutPopupContainer__image aboutPopupContainer__qrCodeImage"
                            src="../../assets/Files/qrCode.png" />
                    </div>
                </div>
                <div class="aboutPopupContainer__section aboutPopupContainer__sectionHalfHeight">
                    <h2 class="aboutPopupContainer__section__header">Metrics</h2>
                    <div class="aboutPopupContainer__section__text">
                        The Metric Gauges track important information about your data. But that's not all! Upon
                        clicking them, the data
                        that needs updating will be pinned to the top of the relevant table, allowing you to easily
                        identify
                        and fix it
                    </div>
                    <img class="aboutPopupContainer__image aboutPopupContainer__metricsImage"
                        src="../../assets/Files/metrics.png" />
                    <img class="aboutPopupContainer__image aboutPopupContainer__hoverAtRiskIconImage"
                        src="../../assets/Files/hoverAtRiskIcon.png" />
                </div>
                <div class="aboutPopupContainer__section aboutPopupContainer__sectionHalfHeight">
                    <h2 class="aboutPopupContainer__section__header">Searching</h2>
                    <div class="aboutPopupContainer__section__text">
                        Searching allows you to quickly find a record by one of its values. The one thing to remember
                        about
                        searching, though,
                        is that ony the current sorted header column will be searched. If you want to search for a value
                        in
                        a different column,
                        you'll have to sort on it first
                    </div>
                    <div>
                        <img class="aboutPopupContainer__image aboutPopupContainer__clickingOnHeaderImage"
                            src="../../assets/Files/clickingOnHeader.png" />
                        <img class="aboutPopupContainer__image aboutPopupContainer__searchingImage"
                            src="../../assets/Files/searching.png" />
                        <img class="aboutPopupContainer__image aboutPopupContainer__searchedValueImage"
                            src="../../assets/Files/searchedValue.png" />
                    </div>
                </div>
                <div class="aboutPopupContainer__section">
                    <h2 class="aboutPopupContainer__section__header">Graph Target</h2>
                    <div class="aboutPopupContainer__section__text">
                        Knowing how secure all your Passwords / Values should be is important. By default, the target
                        line on
                        the Password / Value Graph is turned off but, you can toggle
                        it on by clicking on the Target Legend Icon.
                    </div>
                    <div>
                        <img class="aboutPopupContainer__image aboutPopupContainer__graphHideTargetImage"
                            src="../../assets/Files/graphHideTarget.png" />
                        <img class="aboutPopupContainer__image aboutPopupContainer__graphShowTargetImage"
                            src="../../assets/Files/graphShowTarget.png" />
                    </div>
                </div>
            </ScrollView>
            <ScrollView v-else class="aboutPopupContainer__sections" :color="primaryColor">
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
                        <TextAreaInputField :colorModel="colorModel" :label="'Description'" v-model="bugDescription"
                            :width="'19vw'" :height="'15vh'" :minWidth="'216px'" :minHeight="'91px'"
                            :maxHeight="'203px'" />
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
            </ScrollView>
        </Transition>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import TableSelector from '../TableSelector.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import PopupButton from '../InputFields/PopupButton.vue';
import ScrollView from "../ObjectViews/ScrollView.vue"

import { InputColorModel, SingleSelectorItemModel, defaultInputColorModel } from '../../Types/Models';
import { defaultInputTextColor } from '../../Types/Colors';
import app from "../../Objects/Stores/AppStore";
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { api } from '../../API';

export default defineComponent({
    name: "AboutPopup",
    components:
    {
        TableSelector,
        TextAreaInputField,
        PopupButton,
        ScrollView
    },
    setup()
    {
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

            app.popups.showLoadingIndicator(primaryColor.value, "Reporting Bug");
            const response = await api.server.user.reportBug(bugDescription.value);
            app.popups.hideLoadingIndicator();

            if (response.Success)
            {
                app.popups.showToast(primaryColor.value, "Reported Bug", true);
                bugDescription.value = "";
            }
            else
            {
                defaultHandleFailedResponse(response);
            }
        }

        return {
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
    direction: ltr;
}

.aboutPopupContainer__sectionHalfHeight {
    height: 50%;
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
