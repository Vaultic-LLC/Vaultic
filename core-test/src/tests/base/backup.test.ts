// TODO Have different suites, one for creating backed up data, and then one for verifying it?
// Can run first suite to create it, then close the app and delete local files, then run second suite?
// Or can I just query the database manually via axios? I do know what port its on.

// TODO: Should also test that current and previous signatures match after backing up for store states
// TODO: is there a way to test that merging was not attempted when it shouldn't have been? 
//          - like the merging code should not be ran during 99% of tests since all values are being added on the same device.
//            If it is being attempted, somethign is wrong

// Additional Tests
// [ ] User Has changes and an out of date signature when logging in and when backing up
// [ ] 2 different scenarios, both need to be tested
// [ ] User updates an item on their device but someone else has deleted the item on another device before them
// [ ] the change tracking that the user has for updating should be removed and not pushed to the server
// [ ] test to make sure environment cache gets cleared if exception occurs when syncing after logging out


import { defaultPassword } from "@renderer/Types/DataTypes";
import { api } from "@renderer/API";
import app from "@renderer/Objects/Stores/AppStore";
import { createTestSuite, TestContext } from "@lib/test";

// run the entire app with a few tests in docker (each container would be like a differnt device)?
// let backupTestSuite = createTestSuite("Backup");

// const masterKey = "test";
// const email = "test@gmail.com"

// export default backupTestSuite;