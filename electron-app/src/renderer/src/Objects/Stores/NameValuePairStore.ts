import { NameValuePair, NameValuePairType } from "../../Types/EncryptedData";
import { ComputedRef, computed, reactive } from "vue";
import { stores } from ".";

export interface NameValuePairStore extends NameValuePair
{
	isOld: boolean;
	isSafe: boolean;
	updateValue: (key: string, value: NameValuePair, valueWasUpdated: boolean) => void;
}

export default async function useNameValuePairStore(key: string, nameValuePair: NameValuePair, encrypted: boolean = false): Promise<NameValuePairStore>
{
	const nameValuePairState: NameValuePair = reactive(
		{
			...nameValuePair,
		});

	const isOld: ComputedRef<boolean> = computed(() =>
	{
		const today = Date.now();
		const differenceInDays = (today - nameValuePairState.lastModifiedTime) / 1000 / 86400;

		return differenceInDays >= stores.settingsStore.oldPasswordDays;
	});

	const isSafe: ComputedRef<boolean> = computed(() => !isOld.value && !nameValuePairState.isDuplicate && !nameValuePairState.isWeak)

	function checkIsWeak()
	{
		if (!nameValuePairState.valueType || !nameValuePairState.notifyIfWeak)
		{
			nameValuePairState.isWeak = false;
			nameValuePairState.isWeakMessage = "";

			return;
		}

		if (nameValuePairState.valueType == NameValuePairType.Verbal)
		{
			const wordCount: number = nameValuePairState.value.trim().split(/\s+/).length
			if (wordCount < 5)
			{
				nameValuePairState.isWeak = true;
				nameValuePairState.isWeakMessage = "Verbal Code has less than 5 words. For best security, create a Verbal Code that is longer than 5 words";
			}
		}
		else if (nameValuePairState.valueType == NameValuePairType.Passcode)
		{
			const [weak, isWeakMessage] = window.api.helpers.validation.isWeak(nameValuePairState.value, "Passcode");

			nameValuePairState.isWeak = weak;
			nameValuePairState.isWeakMessage = isWeakMessage;
		}
	}

	function encryptedValue(key: string)
	{
		nameValuePairState.value = window.api.utilities.crypt.encrypt(key, nameValuePairState.value);
	}

	function updateValue(key: string, value: NameValuePair, valueWasUpdated: boolean)
	{
		Object.assign(nameValuePairState, value);

		if (valueWasUpdated)
		{
			nameValuePairState.lastModifiedTime = Date.now();
			nameValuePairState.valueLength = nameValuePairState.value.length;

			checkIsWeak();
			encryptedValue(key);
		}
		else if (!value.notifyIfWeak)
		{
			nameValuePairState.isWeak = false;
			nameValuePairState.isWeakMessage = "";
		}
	}

	// creating new value
	if (!encrypted)
	{
		nameValuePairState.valueLength = nameValuePairState.value.length;
		checkIsWeak();
		encryptedValue(key);

		await stores.filterStore.addFiltersToNewValue(key, stores.filterStore.nameValuePairFilters, nameValuePairState, "nameValuePairs");
	}

	return {
		get id() { return nameValuePairState.id; },
		get name() { return nameValuePairState.name; },
		set name(value: string) { nameValuePairState.name = value; },
		get value() { return nameValuePairState.value; },
		get valueType() { return nameValuePairState.valueType; },
		get notifyIfWeak() { return nameValuePairState.notifyIfWeak; },
		get additionalInformation() { return nameValuePairState.additionalInformation; },
		get lastModifiedTime() { return nameValuePairState.lastModifiedTime; },
		get filters() { return nameValuePairState.filters; },
		get groups() { return nameValuePairState.groups; },
		get isOld() { return isOld.value; },
		get isDuplicate() { return nameValuePairState.isDuplicate; },
		set isDuplicate(value: boolean) { nameValuePairState.isDuplicate = value; },
		get isWeak() { return nameValuePairState.isWeak; },
		get isWeakMessage() { return nameValuePairState.isWeakMessage; },
		get isSafe() { return isSafe.value },
		get isPinned() { return nameValuePairState.isPinned; },
		set isPinned(value: boolean) { nameValuePairState.isPinned = value; },
		get valueLength() { return nameValuePairState.valueLength; },
		updateValue
	};
}
