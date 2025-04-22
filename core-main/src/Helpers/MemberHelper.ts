import { Member, Organization } from "@vaultic/shared/Types/DataTypes";
import { environment } from "../Environment";
import vaulticServer from "../Server/VaulticServer";
import { AddedOrgInfo, AddedVaultInfo, AddedVaultMembersInfo, ModifiedOrgMember, OrgAndUserKeys, UserIDAndKey } from "@vaultic/shared/Types/ClientServerTypes";
import { PublicKeys, PublicKeyType } from "@vaultic/shared/Types/Keys";
import vaultHelper from "./VaultHelper";

export async function vaultAddedOrgsToAddedOrgInfo(senderUserID: number, vaultKey: string, addedOrgs:
    Organization[]): Promise<AddedOrgInfo>
{
    const users: Set<number> = new Set();
    addedOrgs.forEach(o =>
    {
        o.membersByUserID.forEach((v, k, map) => users.add(k));
    });

    const allMembers = Array.from(users);

    let usersAndPublicKeys: { [key: number]: PublicKeys } = {};
    if (allMembers.length > 0)
    {
        const getPublicKeyResponse = await vaulticServer.user.getPublicKeys(PublicKeyType.Encrypting, allMembers);
        if (!getPublicKeyResponse.Success)
        {
            return;
        }

        usersAndPublicKeys = getPublicKeyResponse.UsersAndPublicKeys;
    }

    const orgsAndUserKeys: { [key: number]: OrgAndUserKeys } = {};
    for (let i = 0; i < addedOrgs.length; i++)
    {
        const userIDsAndKeys: UserIDAndKey[] = [];
        for (const [key, _] of addedOrgs[i].membersByUserID.entries()) 
        {
            const recipientPublicKey = usersAndPublicKeys[key];
            if (!recipientPublicKey || !recipientPublicKey.PublicEncryptingKey)
            {
                continue;
            }

            const result = await vaultHelper.prepareVaultKeyForRecipient(senderUserID, recipientPublicKey.PublicEncryptingKey, vaultKey);

            if (!result.success)
            {
                continue;
            }

            // VaultKey needs to include Senders UserID so we know what publicSignignKey to retrieve later
            const userIDAndKey: UserIDAndKey =
            {
                UserID: key,
                VaultKey: result.value
            };

            userIDsAndKeys.push(userIDAndKey);
        }

        const orgAndUserKeys: OrgAndUserKeys =
        {
            OrganizationID: addedOrgs[i].organizationID,
            UserIDsAndKeys: userIDsAndKeys
        };

        orgsAndUserKeys[addedOrgs[i].organizationID] = orgAndUserKeys;
    }

    return {
        AllMembers: allMembers,
        OrgsAndUsersKeys: orgsAndUserKeys
    };
}

export async function vaultAddedMembersToOrgMembers(senderUserID: number,
    vaultKey: string, members: Member[]): Promise<AddedVaultMembersInfo>
{
    const allUsers: number[] = [];
    const orgMembers: ModifiedOrgMember[] = [];

    for (let i = 0; i < members.length; i++)
    {
        const result = await vaultHelper.prepareVaultKeyForRecipient(senderUserID, members[i].publicEncryptingKey, vaultKey);

        if (!result.success)
        {
            continue;
        }

        const orgMember: ModifiedOrgMember =
        {
            UserID: members[i].userID,
            Permissions: members[i].permission,
            VaultKeysByVaultID: {}
        };

        // There will only be one vaultKeysByVaultID here so we can just set -1
        orgMember.VaultKeysByVaultID[-1] = result.value;;

        allUsers.push(members[i].userID);
        orgMembers.push(orgMember);
    }

    return {
        AllMembers: allUsers,
        ModifiedOrgMembers: orgMembers
    };
}

export function memberArrayToModifiedOrgMemberWithoutVaultKey(members: Member[]): ModifiedOrgMember[]
{
    return members.map(m => 
    {
        const modifiedOrgMember: ModifiedOrgMember =
        {
            UserID: m.userID,
            Permissions: m.permission
        }

        return modifiedOrgMember;
    });
}

export async function organizationUpdateAddedMembersToAddedOrgMembers(masterKey: string, senderUserID: number,
    allUserVaultsInOrgIDs: number[], addedMembers: Member[]): Promise<[number[], ModifiedOrgMember[]]>
{
    const addedOrgMembers: ModifiedOrgMember[] = addedMembers.map(m => 
    {
        const mom: ModifiedOrgMember =
        {
            UserID: m.userID,
            Permissions: m.permission,
            VaultKeysByVaultID: {}
        };

        return mom;
    });

    const vaultIDs: Set<number> = new Set();
    if (allUserVaultsInOrgIDs.length > 0)
    {
        const memberVaultIdAndKeys: Map<number, { [key: number]: string }> = new Map();
        const userVaultsAndKeys = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, allUserVaultsInOrgIDs);

        for (let i = 0; i < userVaultsAndKeys[0].length; i++)
        {
            vaultIDs.add(userVaultsAndKeys[0][i].vaultID);
            for (let j = 0; j < addedMembers.length; j++)
            {
                const result = await vaultHelper.prepareVaultKeyForRecipient(senderUserID,
                    addedMembers[i].publicEncryptingKey, userVaultsAndKeys[1][i]);

                if (!result.success)
                {
                    continue;
                }

                if (!memberVaultIdAndKeys.has(addedMembers[j].userID))
                {
                    memberVaultIdAndKeys.set(addedMembers[j].userID, {});
                }

                memberVaultIdAndKeys.get(addedMembers[j].userID)[userVaultsAndKeys[0][i].vault.vaultID] = result.value;
            }
        }

        addedOrgMembers.forEach(m => 
        {
            m.VaultKeysByVaultID = memberVaultIdAndKeys.get(m.UserID);
        });
    }

    return [Array.from(vaultIDs), addedOrgMembers ?? []];
}

export async function organizationUpdateAddedVaultsToAddedOrgMembers(masterKey: string, senderUserID: number,
    addedVaults: number[], allMembers: Member[]): Promise<AddedVaultInfo>
{
    let modifiedOrgMembers: [number[], ModifiedOrgMember[]] = [[], []];
    if (allMembers.length > 0)
    {
        const users: Set<number> = new Set();
        allMembers.forEach(m => 
        {
            users.add(m.userID);
        });

        const allMembersArray = Array.from(users);
        const getPublicKeyResponse = await vaulticServer.user.getPublicKeys(PublicKeyType.Encrypting, allMembersArray);
        if (!getPublicKeyResponse.Success)
        {
            return;
        }

        allMembers.forEach(m => 
        {
            const publicKeys = getPublicKeyResponse.UsersAndPublicKeys[m.userID];
            if (publicKeys && publicKeys.PublicEncryptingKey)
            {
                m.publicEncryptingKey = publicKeys.PublicEncryptingKey;
            }
        });

        modifiedOrgMembers = await organizationUpdateAddedMembersToAddedOrgMembers(masterKey, senderUserID, addedVaults, allMembers);
    }

    return {
        AllVaults: addedVaults,
        ModifiedOrgMembers: modifiedOrgMembers[1]
    }
}

export function organizationArrayToOrganizationIDArray(organizations: Organization[]): number[]
{
    const set: Set<number> = new Set();
    organizations.forEach(o => set.add(o.organizationID));

    return Array.from(set);
}

export function memberArrayToUserIDArray(members: Member[]): number[]
{
    const set: Set<number> = new Set();
    members.forEach(m => set.add(m.userID));

    return Array.from(set);
}