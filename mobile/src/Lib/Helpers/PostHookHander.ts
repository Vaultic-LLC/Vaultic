import { PostTransactionHooks } from "@vaultic/shared/Types/Repositories";

import { registerPlugin } from '@capacitor/core';

const postHookHandlerPlugin = registerPlugin<PostHookHandler>('PostHookHandler');

class PostHookHandler implements PostTransactionHooks
{
    async postInsert(table: string, key: string, entity: string): Promise<void> 
    {
        postHookHandlerPlugin.postInsert(table, key, entity);
    }

    async postUpdate(table: string, key: string, entity: string): Promise<void> 
    {
        postHookHandlerPlugin.postUpdate(table, key, entity);
    }

    async postOverride(table: string, findBy: number, entity: string): Promise<void> 
    {
        postHookHandlerPlugin.postOverride(table, findBy, entity);
    }

    async postDelete(table: string, findBy: number): Promise<void> 
    {
        postHookHandlerPlugin.postDelete(table, findBy);
    }
}

export const postHookHandler = new PostHookHandler();