import { AllowSharingFrom, ServerPermissions } from '@vaultic/shared/Types/ClientServerTypes';
import { RequireMFAOn } from '@vaultic/shared/Types/Device';

export type SchemaObject = Partial<
{
    CreatedTime: number;
    LastModifiedTime: number;
}>

export type StoreScheamObject = SchemaObject & Partial<
{
    CurrentSignature: string;
    PreviousSignature: string;

    State: string;
}>

export type User = SchemaObject & Partial<
{
    UserID: number;
    FirstName: string;
    LastName: string;
    Email: string;
    Username: string;

    RegistrationRecord: string;
    UserIdentifier: string;

    // public License License { get; set; }
    // public Session Session { get; set; }
    // public StripeData StripeData { get; set; }
}>

export type UserOrganization = SchemaObject & Partial<
{
    UserOrganizationID: number;
    UserID: number;
    OrganizationID: number;
    Permissions: ServerPermissions;
}>

export type UserData = SchemaObject & Partial<
{
    UserDataID: number;
    UserID: number;

    CurrentSignature: string;
    MasterKeyEncryptionAlgorithm: string;
    PublicSigningKey: string;
    PrivateSigningKey: string;
    PublicEncryptingKey: string;
    PrivateEncryptingKey: string;
    AllowSharedVaultsFromOthers: string;
    KSFParams: string;

    DeviceSalt: string;

    AllowSharingFrom: AllowSharingFrom;
    RequireMFAOn: RequireMFAOn;

    LastLoadedChangeTrackingVersion: number;
}>

export type UserVault = SchemaObject &  Partial<
{
    UserVaultID: number;
    UserOrganizationID: number;
    OrganizationVaultID: number;
    CurrentSignature: string;
    VaultKey: string;
    ClientFailedToSave: boolean;
    LastLoadedChangeTrackingVersion: number;
}>

export type VaultPreferencesStoreState = StoreScheamObject & Partial<
{
    VaultPreferencesStoreStateID: number;
    UserVaultID: number;
}>

export type Organization = SchemaObject & Partial<
{
    OrganizationID: number;
    Name: string;
    Type: number;
    UserIDOwner: number;
}>

export type OrganizationVault = SchemaObject & Partial<
{
    OrganizationVaultID: number;
    OrganizationID: number;
    VaultID: number;
}>

export type Vault = SchemaObject & Partial<
{
    VaultID: number;
    CurrentSignature: string;
    Name: string;
    IsArchived: boolean;
    IsShared: boolean;
}>

export type VaultStoreState = StoreScheamObject & Partial<
{
    VaultStoreStateID: number;
    VaultID: number;
}>

export type PasswordStoreState = StoreScheamObject & Partial<
{
    PasswordStoreStateID: number;
    VaultID: number;
}>

export type ValueStoreState = StoreScheamObject & Partial<
{
    ValueStoreStateID: number;
    VaultID: number;
}>

export type FilterStoreState = StoreScheamObject & Partial<
{
    FilterStoreStateID: number;
    VaultID: number;
}>

export type GroupStoreState = StoreScheamObject & Partial<
{
    GroupStoreStateID: number;
    VaultID: number;
}>