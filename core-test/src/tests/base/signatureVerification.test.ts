// TODO: this is important so I can confidently throw exceptions when entity verification fails
// can I somehow alter the db while the app is running? Maybe with an npm package?
// Could I load a new db with invalid signatures so that the verification will fail when
// attempting to use this database?
// Maybe have a docker script that will run some tests, close, run a node script to edit the db, and then run some more unit tests?