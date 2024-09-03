import { MigrationInterface, QueryRunner, Table, TableColumnOptions, TableForeignKey } from "typeorm";

export class CreateSchema1722604318830 implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void>
    {
        const vaulticEntityProperties: TableColumnOptions[] = [
            {
                name: "signatureSecret",
                type: "text"
            },
            {
                name: "currentSignature",
                type: "text"
            },
            {
                name: "entityState",
                type: "integer"
            }
        ];

        const storeStateProperties: TableColumnOptions[] = [
            {
                name: "state",
                type: "text"
            },
            {
                name: "previousSignature",
                type: "text"
            }
        ];

        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                ...vaulticEntityProperties,
                {
                    name: "userID",
                    isPrimary: true,
                    type: "integer",
                },
                {
                    name: "email",
                    type: "text"
                },
                {
                    name: "lastUsed",
                    type: "boolean"
                },
                {
                    name: "masterKeyHash",
                    type: "text"
                },
                {
                    name: "masterKeySalt",
                    type: "text"
                },
                {
                    name: "publicKey",
                    type: "text"
                },
                {
                    name: "privateKey",
                    type: "text"
                },
                {
                    name: "appStoreStateID",
                    type: "integer"
                },
                {
                    name: "userPreferencesStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "userVaults",
            columns: [
                ...vaulticEntityProperties,
                {
                    name: "userVaultID",
                    isPrimary: true,
                    type: "integer",
                },
                {
                    name: "userID",
                    type: "integer"
                },
                {
                    name: "vaultID",
                    type: "integer"
                },
                {
                    name: "vaultKey",
                    type: "text"
                },
                {
                    name: "vaultPreferencesStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "vaults",
            columns: [
                ...vaulticEntityProperties,
                {
                    name: "vaultID",
                    type: "integer",
                    isPrimary: true
                },
                {
                    name: "name",
                    type: "string"
                },
                {
                    name: "color",
                    type: "string"
                },
                {
                    name: "lastUsed",
                    type: "boolean"
                },
                {
                    name: "vaultStoreStateID",
                    type: "integer"
                },
                {
                    name: "passwordStoreStateID",
                    type: "integer"
                },
                {
                    name: "valueStoreStateID",
                    type: "integer"
                },
                {
                    name: "filterStoreStateID",
                    type: "integer"
                },
                {
                    name: "groupStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "appStoreStates",
            columns: [
                ...vaulticEntityProperties,
                ...storeStateProperties,
                {
                    name: "appStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "userPreferencesStoreStates",
            columns: [
                ...vaulticEntityProperties,
                ...storeStateProperties,
                {
                    name: "userPreferencesStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "vaultPreferencesStoreStates",
            columns: [
                ...vaulticEntityProperties,
                ...storeStateProperties,
                {
                    name: "vaultPreferencesStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "vaultStoreStates",
            columns: [
                ...vaulticEntityProperties,
                ...storeStateProperties,
                {
                    name: "vaultStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "passwordStoreStates",
            columns: [
                ...vaulticEntityProperties,
                ...storeStateProperties,
                {
                    name: "passwordStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "valueStoreStates",
            columns: [
                ...vaulticEntityProperties,
                ...storeStateProperties,
                {
                    name: "valueStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "filterStoreStates",
            columns: [
                ...vaulticEntityProperties,
                ...storeStateProperties,
                {
                    name: "filterStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "groupStoreStates",
            columns: [
                ...vaulticEntityProperties,
                ...storeStateProperties,
                {
                    name: "groupStoreStateID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createForeignKey(
            "userVaults",
            new TableForeignKey({
                columnNames: ["userID"],
                referencedColumnNames: ["userID"],
                referencedTableName: "users",
                onDelete: "CASCADE",
            }),
        );

        await queryRunner.createForeignKey(
            "userVaults",
            new TableForeignKey({
                columnNames: ["vaultID"],
                referencedColumnNames: ["vaultID"],
                referencedTableName: "vaults",
                onDelete: "CASCADE",
            }),
        );

        await queryRunner.createForeignKey(
            "users",
            new TableForeignKey({
                columnNames: ["appStoreStateID"],
                referencedColumnNames: ["appStoreStateID"],
                referencedTableName: "appStoreStates",
                onDelete: "CASCADE",
            }),
        );

        await queryRunner.createForeignKey(
            "users",
            new TableForeignKey({
                columnNames: ["userPreferencesStoreStateID"],
                referencedColumnNames: ["userPreferencesStoreStateID"],
                referencedTableName: "userPreferencesStoreState",
                onDelete: "CASCADE",
            }),
        );

        await queryRunner.createForeignKey(
            "userVaults",
            new TableForeignKey({
                columnNames: ["vaultPreferencesStoreStateID"],
                referencedColumnNames: ["vaultPreferencesStoreStateID"],
                referencedTableName: "vaultPreferencesStoreStates",
                onDelete: "CASCADE",
            }),
        );

        await queryRunner.createForeignKey(
            "vaults",
            new TableForeignKey({
                columnNames: ["vaultStoreStateID"],
                referencedColumnNames: ["vaultStoreStateID"],
                referencedTableName: "vaultStoreStates",
                onDelete: "CASCADE",
            }),
        );

        await queryRunner.createForeignKey(
            "vaults",
            new TableForeignKey({
                columnNames: ["passwordStoreStateID"],
                referencedColumnNames: ["passwordStoreStateID"],
                referencedTableName: "passwordStoreStates",
                onDelete: "CASCADE",
            }),
        );

        await queryRunner.createForeignKey(
            "vaults",
            new TableForeignKey({
                columnNames: ["valueStoreStateID"],
                referencedColumnNames: ["valueStoreStateID"],
                referencedTableName: "valueStoreStates",
                onDelete: "CASCADE",
            }),
        );

        await queryRunner.createForeignKey(
            "vaults",
            new TableForeignKey({
                columnNames: ["filterStoreStateID"],
                referencedColumnNames: ["filterStoreStateID"],
                referencedTableName: "filterStoreStates",
                onDelete: "CASCADE",
            }),
        );

        await queryRunner.createForeignKey(
            "userVaults",
            new TableForeignKey({
                columnNames: ["groupStoreStateID"],
                referencedColumnNames: ["groupStoreStateID"],
                referencedTableName: "groupStoreStates",
                onDelete: "CASCADE",
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void>
    {
        const table = await queryRunner.getTable("userVaults");
        if (table)
        {
            const userIDFK = table.foreignKeys.find((fk) => fk.columnNames.indexOf("userID") !== -1)
            if (userIDFK)
            {
                await queryRunner.dropForeignKey("userVaults", userIDFK);
            }

            const vaultIDFK = table.foreignKeys.find((fk) => fk.columnNames.indexOf("vaultID") !== -1)
            if (vaultIDFK)
            {
                await queryRunner.dropForeignKey("userVaults", vaultIDFK);
            }
        }

        await queryRunner.dropTable("userVaults");
        await queryRunner.dropTable("users");
        await queryRunner.dropTable("vaults");
    }
}
