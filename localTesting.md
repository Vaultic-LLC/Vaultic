# How to test locally

### Requirements
1) Need to have the VaulticServer repo
2) Need to have docker installed

### Setup
1) Run the `startLocalDatabase.bat` file located in the root of the VaulticServer repo
2) Open up 2 instances of the VaulticServer repo Visual Studio and run the API and STS projects, each in their own Visual Studio instance
3) Open up the Vaultic Client App in Visual Studio Code
4) Change "main" in electron-app/package.json to `"./out/main/index.js"`
5) navigate to the `electron-app-test` project
4) Run `npm run test`

### Unit Tests
You can run unit tests by calling `runAllTests` at the end of the `initApp` method in `electron-app-test/src/renderer/main.ts`. Once the app launches, open the console
to view the progress and result of Unit Tests. **Note: this requires the Setup above to be completed **

### Additional Testing 
PG Admin will be running locally if you need to query and analyze the database. You can access it by navigating to `localhost:5050`, logging in, and adding the server.
Account Credentials:
- Email: root@root.com
- Password: root

Server Credentials:
- Name: VaulticTest
- Host name / address: host.docker.internal
- Password: root

### Packaging
1) Change "main" in electron-app/package.json to `./dist/main/index.js`