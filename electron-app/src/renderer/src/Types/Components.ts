interface Component extends HTMLElement { }

export interface InputComponent extends Component
{
	invalidate: (message: string) => void;
}
