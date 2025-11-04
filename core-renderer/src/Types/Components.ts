import { Member } from "@vaultic/shared/Types/DataTypes";

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

export interface EncryptedInputFieldComponent extends InputComponent
{
    toggleMask: (mask: boolean) => void;
}

export interface TableTemplateComponent extends Component
{
    calcScrollbarColor: () => void;
}

export interface MemberChanges
{
    addedMembers: Map<number, Member>;
    updatedMembers: Map<number, Member>;
    removedMembers: Map<number, Member>;
}

export interface MemberTableComponent extends Component 
{
    getChanges: () => MemberChanges;
}

export interface ObjectViewComponent extends Component
{
    addWarning: (message: string) => void;
}