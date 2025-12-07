export interface VaulticNotification
{
    text: string;
    description: string;
    button?: { text: string, onClick: () => Promise<void> };
}