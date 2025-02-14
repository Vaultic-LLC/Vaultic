import { MigrationInterface, QueryRunner, Table, TableColumnOptions, TableForeignKey } from "typeorm";

export class CreateSchema1722604318830 implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void>
    {
        const vaulticEntityProperties: TableColumnOptions[] = [
            {
                name: "currentSignature",
                type: "text"
            },
            {
                name: "entityState",
                type: "integer"
            },
            {
                name: "serializedPropertiesToSync",
                type: "text"
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
                    name: "firstName",
                    type: "text"
                },
                {
                    name: "lastName",
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
                    name: "masterKeyEncryptionAlgorithm",
                    type: "integer"
                },
                {
                    name: "publicSigningKey",
                    type: "text"
                },
                {
                    name: "privateSigningKey",
                    type: "text"
                },
                {
                    name: "publicEncryptingKey",
                    type: "text"
                },
                {
                    name: "privateEncryptingKey",
                    type: "text"
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
                    name: "userOrganizationID",
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
                    name: "isOwner",
                    type: "boolean",
                },
                {
                    name: "permissions",
                    type: "integer",
                    isNullable: true
                },
                {
                    name: "vaultKey",
                    type: "text"
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
                    type: "text"
                },
                {
                    name: "shared",
                    type: "boolean"
                },
                {
                    name: "isArchived",
                    type: "boolean"
                },
                {
                    name: "lastUsed",
                    type: "boolean"
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
                    isPrimary: true,
                    type: "integer"
                },
                {
                    name: "userID",
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
                    isPrimary: true,
                    type: "integer"
                },
                {
                    name: "userID",
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
                    isPrimary: true,
                    type: "integer"
                },
                {
                    name: "userVaultID",
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
                    isPrimary: true,
                    type: "integer"
                },
                {
                    name: "vaultID",
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
                    isPrimary: true,
                    type: "integer"
                },
                {
                    name: "vaultID",
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
                    isPrimary: true,
                    type: "integer"
                },
                {
                    name: "vaultID",
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
                    isPrimary: true,
                    type: "integer"
                },
                {
                    name: "vaultID",
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
                    isPrimary: true,
                    type: "integer"
                },
                {
                    name: "vaultID",
                    type: "integer"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "logs",
            columns: [
                {
                    name: "logID",
                    isPrimary: true,
                    type: "integer"
                },
                {
                    name: "currentUserEmail",
                    type: "text",
                },
                {
                    name: "time",
                    type: "datetime"
                },
                {
                    name: "errorCode",
                    type: "integer"
                },
                {
                    name: "message",
                    type: "text"
                },
                {
                    name: "callStack",
                    type: "text"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "changeTrackings",
            columns: [
                ...vaulticEntityProperties,
                {
                    name: "changeTrackingID",
                    isPrimary: true,
                    type: "integer",
                },
                {
                    name: "userID",
                    type: "integer"
                },
                {
                    name: "objectID",
                    type: "text"
                },
                {
                    name: "objectState",
                    type: "integer"
                },
                {
                    name: "lastModifiedTime",
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
            })
        );

        await queryRunner.createForeignKey(
            "userVaults",
            new TableForeignKey({
                columnNames: ["vaultID"],
                referencedColumnNames: ["vaultID"],
                referencedTableName: "vaults",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createForeignKey(
            "appStoreStates",
            new TableForeignKey({
                columnNames: ["userID"],
                referencedColumnNames: ["userID"],
                referencedTableName: "users",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createForeignKey(
            "userPreferencesStoreStates",
            new TableForeignKey({
                columnNames: ["userID"],
                referencedColumnNames: ["userID"],
                referencedTableName: "users",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createForeignKey(
            "vaultPreferencesStoreStates",
            new TableForeignKey({
                columnNames: ["userVaultID"],
                referencedColumnNames: ["userVaultID"],
                referencedTableName: "userVaults",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createForeignKey(
            "vaultStoreStates",
            new TableForeignKey({
                columnNames: ["vaultID"],
                referencedColumnNames: ["vaultID"],
                referencedTableName: "vaults",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createForeignKey(
            "passwordStoreStates",
            new TableForeignKey({
                columnNames: ["vaultID"],
                referencedColumnNames: ["vaultID"],
                referencedTableName: "vaults",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createForeignKey(
            "valueStoreStates",
            new TableForeignKey({
                columnNames: ["vaultID"],
                referencedColumnNames: ["vaultID"],
                referencedTableName: "vaults",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createForeignKey(
            "filterStoreStates",
            new TableForeignKey({
                columnNames: ["vaultID"],
                referencedColumnNames: ["vaultID"],
                referencedTableName: "vaults",
                onDelete: "CASCADE",
            })
        );

        await queryRunner.createForeignKey(
            "groupStoreStates",
            new TableForeignKey({
                columnNames: ["vaultID"],
                referencedColumnNames: ["vaultID"],
                referencedTableName: "vaults",
                onDelete: "CASCADE",
            })
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
