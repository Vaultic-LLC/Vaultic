interface Component extends HTMLElement { }

export interface InputComponent extends Component
{
	invalidate: (message: string) => void;
}

export interface FormComponent extends Component
{
	showAlertMessage: (isInfo: boolean, message: string) => void;
}

export interface AuthPopup extends Component
{
	playUnlockAnimation: () => void;
}
