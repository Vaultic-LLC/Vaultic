import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateSchema1722604318830 implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void>
    {
        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                {
                    name: "userID",
                    type: "integer",
                    isPrimary: true
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
                    name: "email",
                    type: "text"
                },
                {
                    name: "userIdentifier",
                    type: "text"
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
                    name: "privateKey",
                    type: "text"
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "userVaults",
            columns: [
                {
                    name: "userVaultID",
                    type: "integer",
                    isPrimary: true
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
                }
            ]
        }));

        await queryRunner.createTable(new Table({
            name: "vaults",
            columns: [
                {
                    name: "vaultID",
                    type: "integer",
                    isPrimary: true
                },
                {
                    name: "vaultIdentifier",
                    type: "string"
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
                    name: "appStoreState",
                    type: "string"
                },
                {
                    name: "settingsStoreState",
                    type: "string"
                },
                {
                    name: "passwordStoreState",
                    type: "string"
                },
                {
                    name: "valueStoreState",
                    type: "string"
                },
                {
                    name: "filterStoreState",
                    type: "string"
                },
                {
                    name: "groupStoreState",
                    type: "string"
                },
                {
                    name: "userPreferencesStoreState",
                    type: "string"
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
        )
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
