import { Member, Organization } from "@vaultic/shared/Types/DataTypes";
import { environment } from "../Environment";
import vaulticServer from "../Server/VaulticServer";
import { AddedOrgInfo, AddedVaultInfo, AddedVaultMembersInfo, ModifiedOrgMember, OrgAndUserKeys, UserIDAndKey, VaultIDAndKey } from "@vaultic/shared/Types/ClientServerTypes";

export async function vaultAddedOrgsToAddedOrgInfo(vaultKey: string, addedOrgs: Organization[]): Promise<AddedOrgInfo>
{
    const users: Set<number> = new Set();
    addedOrgs.forEach(o => 
    {
        o.members.forEach((v, k, map) => users.add(k));
    });

    const allMembers = Array.from(users);
    const getPublicKeyResponse = await vaulticServer.user.getPublicKeys(allMembers);
    if (!getPublicKeyResponse.Success)
    {
        return;
    }

    const orgsAndUserKeys: { [key: number]: OrgAndUserKeys } = {};
    for (let i = 0; i < addedOrgs.length; i++)
    {
        const userIDsAndKeys: UserIDAndKey[] = [];

        for (const [key, value] of addedOrgs[i].members.entries()) 
        {
            const usersPublicKey = getPublicKeyResponse.UsersAndPublicKeys[key];
            if (!usersPublicKey)
            {
                continue;
            }

            const encryptedVaultKey = await environment.utilities.crypt.ECEncrypt(usersPublicKey, vaultKey);
            if (!encryptedVaultKey.success)
            {
                continue;
            }

            const userIDAndKey: UserIDAndKey =
            {
                UserID: key,
                VaultKey: JSON.vaulticStringify({
                    vaultKey: encryptedVaultKey.value.data,
                    publicKey: encryptedVaultKey.value.publicKey
                })
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

export async function vaultAddedMembersToOrgMembers(vaultKey: string, members: Member[]): Promise<AddedVaultMembersInfo>
{
    const allUsers: number[] = [];
    const orgMembers: ModifiedOrgMember[] = [];

    for (let i = 0; i < members.length; i++)
    {
        const encryptedVaultKey = await environment.utilities.crypt.ECEncrypt(members[i].publicKey, vaultKey);
        if (!encryptedVaultKey.success)
        {
            continue;
        }

        const orgMember: ModifiedOrgMember =
        {
            UserID: members[i].userID,
            Permission: members[i].permission,
            VaultKeysByVaultID: {}
        };

        orgMember.VaultKeysByVaultID[-1] = JSON.vaulticStringify({
            vaultKey: encryptedVaultKey.value.data,
            publicKey: encryptedVaultKey.value.publicKey
        });

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
            Permission: m.permission
        }

        return modifiedOrgMember;
    });
}

export async function organizationUpdateAddedMembersToAddedOrgMembers(masterKey: string, addedVaults: number[], addedMembers: Member[])
{
    const addedOrgMembers: ModifiedOrgMember[] = addedMembers.map(m => 
    {
        const mom: ModifiedOrgMember =
        {
            UserID: m.userID,
            Permission: m.permission,
            VaultKeysByVaultID: {}
        };

        return mom;
    });

    if (addedVaults.length > 0)
    {
        const memberVaultIdAndKeys: Map<number, { [key: number]: string }> = new Map();
        const userVaultsAndKeys = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, addedVaults);

        for (let i = 0; i < userVaultsAndKeys[0].length; i++)
        {
            for (let j = 0; j < addedMembers.length; j++)
            {
                const response = await environment.utilities.crypt.ECEncrypt(addedMembers[j].publicKey, userVaultsAndKeys[1][i]);
                if (!response.success)
                {
                    return;
                }

                const vaultKey = JSON.vaulticStringify({
                    vaultKey: response.value.data,
                    publicKey: response.value.publicKey
                });

                if (!memberVaultIdAndKeys.has(addedMembers[j].userID))
                {
                    memberVaultIdAndKeys.set(addedMembers[j].userID, {});
                }

                memberVaultIdAndKeys.get(addedMembers[j].userID)[userVaultsAndKeys[0][i].vault.vaultID] = vaultKey;
            }
        }

        addedOrgMembers.forEach(m => 
        {
            m.VaultKeysByVaultID = memberVaultIdAndKeys.get(m.UserID);
        });
    }

    return addedOrgMembers;
}

export async function organizationUpdateAddedVaultsToAddedOrgMembers(masterKey: string, addedVaults: number[], allMembers: Member[]):
    Promise<AddedVaultInfo>
{
    const users: Set<number> = new Set();
    allMembers.forEach(m => 
    {
        users.add(m.userID);
    });

    const allMembersArray = Array.from(users);
    const getPublicKeyResponse = await vaulticServer.user.getPublicKeys(allMembersArray);
    if (!getPublicKeyResponse.Success)
    {
        return;
    }

    allMembers.forEach(m => 
    {
        const publicKey = getPublicKeyResponse.UsersAndPublicKeys[m.userID];
        if (publicKey)
        {
            m.publicKey = publicKey;
        }
    });

    const modifiedOrgMembers = await organizationUpdateAddedMembersToAddedOrgMembers(masterKey, addedVaults, allMembers);
    return {
        AllVaults: addedVaults,
        ModifiedOrgMembers: modifiedOrgMembers
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