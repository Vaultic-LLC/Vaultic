import app from "../Objects/Stores/AppStore";
import { NameValuePair, NameValuePairType, Password, SecurityQuestion } from "../Types/EncryptedData";
import { Filter, FilterConditionType, DataType, FilterCondition, Group } from "../Types/Table";
import { generateUniqueID } from "../Helpers/generatorHelper";

const key: string = "TestKey";

function createPasswords()
{
    const createPassword = (id: string, filters: string[], groups: string[], login: string, domain: string, email: string, password: string, passwordFor: string,
        securityQuestions: SecurityQuestion[], additionalInformation: string, lastModifiedTime: number, isDuplicate: boolean = false): Password =>
    {
        return {
            id,
            filters,
            groups,
            login,
            domain,
            email,
            password,
            passwordFor,
            securityQuestions,
            additionalInformation,
            lastModifiedTime: '',
            isDuplicate,
            isWeak: false,
            isWeakMessage: '',
            containsLogin: false,
            passwordLength: 0,
        }
    };

    const thirtyOneDaysAsMiliSeconds: number = 1000 * 86400 * 31;
    const testSecurityQuestions: SecurityQuestion[] = [
        { Id: generateUniqueID([]), question: "Who are You", questionLength: 11, answer: "Me", answerLength: 2 },
        { id: generateUniqueID([]), question: "What color is the sky", questionLength: 21, answer: "red", answerLength: 3 }
    ];

    const johnsGroup: Group = app.currentVault.groupStore.groups.filter(g => g.name == "Johns")[0];
    const marysGroup: Group = app.currentVault.groupStore.groups.filter(g => g.name == "Mary's")[0];
    const bankGroup: Group = app.currentVault.groupStore.groups.filter(g => g.name == "Banks")[0];

    const additionalInfo: string = "afhsdlhf sisl;kf asd;sdifh asdl;asdl; fasdl;fsdi; hasd;klg hasdkl;gh sad;h gasdl;hg sd;shl;fh asd kl; hasdlghas" +
        "afhsdlhf sisl;kf asd;sdifh asdl;asdl; fasdl;fsdi; hasd;klg hasdkl;gh sad;h gasdl;hg sd;shl;fh asd kl; hasdlghas;" +
        "afhsdlhf sisl;kf asd;sdifh asdl;asdl; fasdl;fsdi; hasd;klg hasdkl;gh sad;h gasdl;hg sd;shl;fh asd kl; hasdlghas;" +
        "afhsdlhf sisl;kf asd;sdifh asdl;asdl; fasdl;fsdi; hasd;klg hasdkl;gh sad;h gasdl;hg sd;shl;fh asd kl; hasdlghas;" +
        "afhsdlhf sisl;kf asd;sdifh asdl;asdl; fasdl;fsdi; hasd;klg hasdkl;gh sad;h gasdl;hg sd;shl;fh asd kl; hasdlghas;" +
        "afhsdlhf sisl;kf asd;sdifh asdl;asdl; fasdl;fsdi; hasd;klg hasdkl;gh sad;h gasdl;hg sd;shl;fh asd kl; hasdlghas;" +
        "afhsdlhf sisl;kf asd;sdifh asdl;asdl; fasdl;fsdi; hasd;klg hasdkl;gh sad;h gasdl;hg sd;shl;fh asd kl; hasdlghas;" +
        "afhsdlhf sisl;kf asd;sdifh asdl;asdl; fasdl;fsdi; hasd;klg hasdkl;gh sad;h gasdl;hg sd;shl;fh asd kl; hasdlghas;" +
        "afhsdlhf sisl;kf asd;sdifh asdl;asdl; fasdl;fsdi; hasd;klg hasdkl;gh sad;h gasdl;hg sd;shl;fh asd kl; hasdlghas;";


    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns", "www.gmail.com", "John@gmail.com", "ThisisMypassword123]poo", "Gmail", testSecurityQuestions, additionalInfo, (Date.now())));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [marysGroup.id], "MaryP", "www.ftmo.com", "Maryp@gmail.com", "ThisisMypassword123]pasdf", "FTMO", testSecurityQuestions, "", (Date.now())));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "www.gmail.com", "John@gmail.com", "ThisisMypssword123]pofo", "Gmail", testSecurityQuestions, "", Date.now()));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "jSmith", "www.randomWebsite.com", "John@gmail.com", "ThisIsNotAWeakPassword1234$", "Random website", testSecurityQuestions, "", Date.now()));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "www.gmail.com", "John@gmail.com", "ThisIsNotAWeakPassword123$", "Gmail", testSecurityQuestions, "", Date.now()));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "www.ftmo.com", "John@gmail.com", "ThisIsNotAWeakPassword123$", "FTMO", testSecurityQuestions, "", Date.now()));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "www.youtube.com", "John@gmail.com", "Weak", "Youtube", testSecurityQuestions, "", Date.now()));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [bankGroup.id], "MaryP", "www.valleycommunities.com", "mary@gmail.com", "ThisisMypassword123]pooff", "Big Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [marysGroup.id, bankGroup.id], "MaryP", "www.valleycommunities.com", "mary@gmail.com", "ThisisMypassword123]pooff", "Bigger Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns", "www.gmail.com", "John@gmail.com", "ThisisMypassword123]poo", "Gmail", testSecurityQuestions, additionalInfo, (Date.now())));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [marysGroup.id], "MaryP", "www.ftmo.com", "Maryp@gmail.com", "ThisisMypassword123]pasdf", "FTMO", testSecurityQuestions, "", (Date.now())));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "www.gmail.com", "John@gmail.com", "ThisisMypssword123]pofo", "Gmail", testSecurityQuestions, "", Date.now()));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "jSmith", "www.randomWebsite.com", "John@gmail.com", "ThisIsNotAWeakPassword1234$", "Random website", testSecurityQuestions, "", Date.now()));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "www.gmail.com", "John@gmail.com", "ThisIsNotAWeakPassword123$", "Gmail", testSecurityQuestions, "", Date.now()));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "www.ftmo.com", "John@gmail.com", "ThisIsNotAWeakPassword123$", "FTMO", testSecurityQuestions, "", Date.now()));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "www.youtube.com", "John@gmail.com", "Weak", "Youtube", testSecurityQuestions, "", Date.now()));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [bankGroup.id], "MaryP", "www.valleycommunities.com", "mary@gmail.com", "ThisisMypassword123]pooff", "Big Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
    app.currentVault.passwordStore.addPassword(key, createPassword("", [], [marysGroup.id, bankGroup.id], "MaryP", "www.valleycommunities.com", "mary@gmail.com", "ThisisMypassword123]pooff", "Bigger Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
}

async function createNameValuePairs(): Promise<void>
{
    const createNameValuePair = (id: string, filters: string[], groups: string[], name: string, value: string, type: NameValuePairType, additionalInformation: string, lastModifiedTime: number, isDuplicate: boolean = false): NameValuePair =>
    {
        return {
            id,
            filters,
            groups,
            name,
            value,
            valueType: type,
            notifyIfWeak: true,
            additionalInformation,
            lastModifiedTime: '',
            isDuplicate,
            isWeak: false,
            isWeakMessage: '',
            valueLength: 0
        }
    };

    const thirtyOneDaysAsMiliSeconds: number = 1000 * 86400 * 31;

    const codesGroup: Group = app.currentVault.groupStore.Groups.filter(g => g.name == "Codes")[0];
    const phoneCodesGroup: Group = app.currentVault.groupStore.Groups.filter(g => g.name == "Phone Codes")[0];

    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [], "Safe", "65-23-12", NameValuePairType.Safe, "Entering the last number can be kind of finicky. You need to jiggle it a bit in order to get it to work.", (Date.now())));
    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [phoneCodesGroup.id], "Phone Code", "123415", NameValuePairType.Passcode, "", (Date.now())));
    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [], "Bank Verbal Code", "I Like Spaghetti", NameValuePairType.Verbal, "", (Date.now())));
    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [codesGroup.id], "Garage Code", "5134", NameValuePairType.Passcode, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [codesGroup.id], "Car Code", "5134", NameValuePairType.Passcode, "", Date.now()));
    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [], "Secret Phrase", "The cow jumps over the moon", NameValuePairType.Verbal, "", Date.now()));
    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [codesGroup.id], "Computer Code", "2652235", NameValuePairType.Passcode, "", Date.now()));
    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [], "Knock", "Knock Knock ---- Knock Knock Knock", NameValuePairType.Verbal, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [], "Favorite Food", "Pizza", NameValuePairType.Verbal, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [], "SSN", "123-45-6789", NameValuePairType.Information, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
    app.currentVault.valueStore.addNameValuePair(key, createNameValuePair("", [], [], "Stuff", "This is a secret", NameValuePairType.Other, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
}

function createFilters()
{
    const createFilter = (id: string, type: DataType, isActive: boolean, text: string, conditions: FilterCondition[]): Filter =>
    {
        return {
            id,
            key: '',
            passwords: [],
            nameValuePairs: [],
            type,
            isActive,
            text,
            conditions
        }
    }

    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "Gmail Accounts", [{ id: "", property: "passwordFor", filterType: FilterConditionType.EqualTo, value: "Gmail" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "FTMO Accounts", [{ id: "", property: "passwordFor", filterType: FilterConditionType.EqualTo, value: "FTMO" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "A Logins", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "A" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "Johns Passwords", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "j" },
    { id: "", property: "login", filterType: FilterConditionType.Contains, value: "Smith" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "Marys Passwords", [{ "id": "", property: "login", filterType: FilterConditionType.Contains, value: "Mary" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "M For", [{ id: "", property: "passwordFor", filterType: FilterConditionType.Contains, value: "M" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "Email Logins", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "@" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, ".Com Logins", [{ id: "", property: "login", filterType: FilterConditionType.EndsWith, value: ".com" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "B For", [{ id: "", property: "passwordFor", filterType: FilterConditionType.Contains, value: "B" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "Gmail Accounts", [{ id: "", property: "passwordFor", filterType: FilterConditionType.EqualTo, value: "Gmail" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "FTMO Accounts", [{ id: "", property: "passwordFor", filterType: FilterConditionType.EqualTo, value: "FTMO" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "A Logins", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "A" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "Johns Passwords", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "j" },
    { id: "", property: "login", filterType: FilterConditionType.Contains, value: "Smith" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "Marys Passwords", [{ "id": "", property: "login", filterType: FilterConditionType.Contains, value: "Mary" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "M For", [{ id: "", property: "passwordFor", filterType: FilterConditionType.Contains, value: "M" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "Email Logins", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "@" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, ".Com Logins", [{ id: "", property: "login", filterType: FilterConditionType.EndsWith, value: ".com" }]));
    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.Passwords, false, "B For", [{ id: "", property: "passwordFor", filterType: FilterConditionType.Contains, value: "B" }]));

    app.currentVault.filterStore.addFilter(key, createFilter("", DataType.NameValuePairs, false, "Safe", [{ id: "", property: "name", filterType: FilterConditionType.EqualTo, value: "Safe" }]));
}

function createGroups()
{
    const createGroup = (id: string, type: DataType, name: string, color: string): Group =>
    {
        return {
            id,
            key: '',
            passwords: [],
            nameValuePairs: [],
            type,
            name,
            color
        }
    };

    app.currentVault.groupStore.addGroup(key, createGroup("", DataType.Passwords, "Banks", "#ffa801"));
    app.currentVault.groupStore.addGroup(key, createGroup("", DataType.Passwords, "PWords", "#ffa801"));
    app.currentVault.groupStore.addGroup(key, createGroup("", DataType.Passwords, "Johns", "#00f56e"));
    app.currentVault.groupStore.addGroup(key, createGroup("", DataType.Passwords, "Mary's", "#ff0de3"));

    app.currentVault.groupStore.addGroup(key, createGroup("", DataType.NameValuePairs, "Codes", "#ffa801"));
    app.currentVault.groupStore.addGroup(key, createGroup("", DataType.NameValuePairs, "Phone Codes", "#3339ef"));
}

function createLoginRecords()
{
    const secondsInADay: number = 1000 * 86400;

    app.recordLogin(key, Date.now() - (secondsInADay * 10));
    app.recordLogin(key, Date.now() - (secondsInADay * 8));
    app.recordLogin(key, Date.now() - (secondsInADay * 5));
    app.recordLogin(key, Date.now() - (secondsInADay * 3));
    app.recordLogin(key, Date.now() - (secondsInADay * 2));
    app.recordLogin(key, Date.now() - (secondsInADay * 1));
    app.recordLogin(key, Date.now());
    app.recordLogin(key, Date.now() - (secondsInADay * 10));
    app.recordLogin(key, Date.now() - (secondsInADay * 8));
    app.recordLogin(key, Date.now() - (secondsInADay * 5));
    app.recordLogin(key, Date.now() - (secondsInADay * 3));
    app.recordLogin(key, Date.now() - (secondsInADay * 2));
    app.recordLogin(key, Date.now() - (secondsInADay * 1));
    app.recordLogin(key, Date.now());
}

export default async function createTestData()
{
    createGroups();
    createFilters();
    createPasswords();
    await createNameValuePairs();
    createLoginRecords();
}
