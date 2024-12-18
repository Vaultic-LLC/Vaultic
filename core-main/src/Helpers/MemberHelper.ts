import { Member, Organization } from "@vaultic/shared/Types/DataTypes";
import { environment } from "../Environment";
import vaulticServer from "../Server/VaulticServer";
import { AddedOrgInfo, ModifiedOrgMember, OrgAndUserKeys, UserIDAndKey } from "@vaultic/shared/Types/ClientServerTypes";

export async function vaultAddedOrgsToOrgsAndUserVaultKeys(vaultKey: string, addedOrgs: Organization[]): Promise<AddedOrgInfo>
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

export async function vaultAddedMembersToOrgMembers(vaultKey: string, members: Member[])
{
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
            VaultIDAndKeys: [
                {
                    VaultID: -1,
                    VaultKey: JSON.vaulticStringify({
                        vaultKey: encryptedVaultKey.value.data,
                        publicKey: encryptedVaultKey.value.publicKey
                    })
                }
            ]
        }

        orgMembers.push(orgMember);
    }

    return orgMembers;
}