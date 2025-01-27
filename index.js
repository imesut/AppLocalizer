const { PLATFORMS, IOS_TYPE, IOS_OUT_TYPE } = require("./constants.js")
console.log(IOS_OUT_TYPE)
const normalizer = require("./normalizer.js");


// npm run localizer -f Localization.xlsx -p ios/android/web/backend/all -cache_duration 1440/any_minute/0 -document_url xlsxFileUrl -ios_output catalog/list

// Requirements

let XLSX = require('xlsx');
let fs = require('fs');
// var https = require('https');
const {
    http,
    https
} = require('follow-redirects');

const iosStringCatalogProcessor = require("./iosStringCatalogProcessor");

const args = process.argv
const fileNameIndex = args.indexOf("-f")
const platformIndex = args.indexOf("-p")
const cacheIndex = args.indexOf("-cache_duration")
const documentIndex = args.indexOf("-document_url")
const iosOutTypeIndex = args.indexOf("-ios_output")

let documentUrl = documentIndex > 0 && args[documentIndex + 1] !== undefined ? args[documentIndex + 1] : "https://docs.google.com/spreadsheets/d/e/2PACX-1vR.....B00gysnvSqjzeb592gkE/pub?output=xlsx"
let fileName = fileNameIndex > 0 && args[fileNameIndex + 1] !== undefined ? args[fileNameIndex + 1] : "Localization.xlsx"
let platform = platformIndex > 0 && args[platformIndex + 1] !== undefined ? args[platformIndex + 1] : "all"
let cacheDuration = cacheIndex > 0 && args[cacheIndex + 1] !== undefined ? args[cacheIndex + 1] : 1440
let iosOutType = iosOutTypeIndex > 0 && args[iosOutTypeIndex + 1] !== undefined ? args[iosOutTypeIndex + 1] : IOS_OUT_TYPE.CATALOG


// Renew or reuse localization excel file.
if (shouldRenewCache()) {
    renewCache().then(() => {
        generateLocalization();
    })
} else {
    console.log('Using existing localization cache...')
    generateLocalization();
}

// TODO: update for params
// TODO: xcstringcatalog support

function generateLocalization() {
    // Read cached file.
    let table = XLSX.readFile(fileName);

    // First Sheet: Localisations
    let sheet = table.Sheets[table.SheetNames[0]];
    let list = XLSX.utils.sheet_to_json(sheet);

    var platformNamesForSeparateFileLocalizations = [PLATFORMS.android.name]
    
    if (iosOutType === IOS_OUT_TYPE.LIST) {
        platformNamesForSeparateFileLocalizations.push(PLATFORMS.ios.name)
        platformNamesForSeparateFileLocalizations.push(PLATFORMS.ios_infoplist.name)
    }

    let headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0]
    let langCodes = headers.filter(name => !name.endsWith("_key"))

    var iosLocales = {}
    var iosPlistLocales = {}

    if (iosOutType === IOS_OUT_TYPE.CATALOG) {
        iosLocales = iosStringCatalogProcessor.process(list, langCodes, PLATFORMS.ios.key, IOS_TYPE.LOCALIZATION);
        iosPlistLocales = iosStringCatalogProcessor.process(list, langCodes, PLATFORMS.ios.key, IOS_TYPE.PLIST);
    }
    
    // Platforms with single localization file
    let backendList = list.filter(item => item[PLATFORMS.backend.key] !== undefined)
        .map(item => {
            const returnItem = {};
            langCodes.forEach(lang => returnItem[lang] = item[lang]);
            return { [item[PLATFORMS.backend.key]]: returnItem };
        });

    let webList = list.filter(item => item[PLATFORMS.web.key] !== undefined)
        .map(item => {
            const returnItem = {};
            langCodes.forEach(lang => returnItem[lang] = item[lang]);
            return { [item[PLATFORMS.web.key]]: returnItem };
        });

    // Platforms with separate localization files
    // initialize object with platform sub objects
    var resource = {}
    Object.keys(PLATFORMS).forEach(platform => {
        if (PLATFORMS[platform].name !== PLATFORMS.backend.name || PLATFORMS[platform].name !== PLATFORMS.web.name) {
            resource[PLATFORMS[platform].name] = {}
        }
    });

    // create output files
    createDirectories();

    // Adding language arrays to main resource
    langCodes.forEach(langCode => {
        Object.keys(PLATFORMS).forEach(platform => {
            if (PLATFORMS[platform].name !== PLATFORMS.backend.name || PLATFORMS[platform].name !== PLATFORMS.web.name) {
                resource[PLATFORMS[platform].name][langCode] = ""
            }
        });
    });

    // Iterating Cached XLSX File
    let lastElem = false
    for (var i in list) {
        if (i == list.length - 1) {
            lastElem = true
            console.log("lastelem" + i + " --- " + list.length)
        }

        let row = list[i];

        for (var j in langCodes) {
            let langCode = langCodes[j];

            if (!!row[PLATFORMS.android.key]) resource.android[langCode] += processText(PLATFORMS.android, langCode, row[PLATFORMS.android.key], row[langCode], lastElem);

            if (iosOutType === IOS_OUT_TYPE.LIST) {
                if (!!row[PLATFORMS.ios.key]) {
                    if (String(row[PLATFORMS.ios.key]).startsWith("NS")) {
                        // console.log("NSKEY", row[PLATFORMS.ios.key], langCode)
                        resource.ios_infoplist[langCode] += processText(PLATFORMS.ios_infoplist, langCode, row[PLATFORMS.ios.key], row[langCode], lastElem);
                    } else {
                        resource.ios[langCode] += processText(PLATFORMS.ios, langCode, row[PLATFORMS.ios.key], row[langCode], lastElem);
                    }
                }
            }
        }
    }



    /*{{А-2}}
    Text Helper Funtion
    */
    function processText(platform, lang, key, value, lastElem) {
        value = String(value).replaceAll("\n", "\\n");
        switch (platform.name) {
            case PLATFORMS.android.name:
                value = normalizer.normalizeStringValue(platform, lang, value)
                return `<string name="${key}">${value}</string>\n`;
            case PLATFORMS.ios_infoplist.name:
            case PLATFORMS.ios.name:
                value = normalizer.normalizeStringValue(platform, lang, value)
                return `"${key}" = "${value}";\n`;
            default:
                return;
        }
    }

    writeFiles();

    if (iosOutType === IOS_OUT_TYPE.CATALOG) {
        fs.writeFileSync("outputs/ios/Localizable.xcstrings", JSON.stringify(iosLocales, null, 2), { flag: 'w' }, (e) => {
            if (e) console.log(e);
        });

        fs.writeFileSync("outputs/ios/InfoPlist.xcstrings", JSON.stringify(iosPlistLocales, null, 2), { flag: 'w' }, (e) => {
            if (e) console.log(e);
        });
    }

    fs.writeFileSync("outputs/backend.json", JSON.stringify(backendList, null, 2), { flag: 'w' }, (e) => {
        if (e) console.log(e);
    });

    fs.writeFileSync("outputs/web.json", JSON.stringify(webList, null, 2), { flag: 'w' }, (e) => {
        if (e) console.log(e);
    });

    /*
    Writing Files
    */

    function writeFiles() {

        platformNamesForSeparateFileLocalizations.forEach(platformName => {

            if (platformName !== PLATFORMS.backend.name || platformName !== PLATFORMS.web.name) {

                var lastElem = false

                for (var j in langCodes) {
                    if (lastElem === langCodes - 1) {
                        lastElem = true
                    }

                    let lang = langCodes[j];
                    let data = resource[platformName][lang];

                    // console.log(data)

                    if (platformName === PLATFORMS.ios.name) {
                        fileName = `outputs/ios/${lang}.lproj/Localizable.strings`;
                    }
                    if (platformName === PLATFORMS.ios_infoplist.name) {
                        fileName = `outputs/ios/${lang}.lproj/Info.plist`;
                        let infoPlistFileName = `outputs/ios/${lang}.lproj/InfoPlist.strings`;
                        let fileName2 = `outputs/ios-plist/${lang}.lproj/Info.plist`;
                        let infoPlistFileName2 = `outputs/ios-plist/${lang}.lproj/InfoPlist.strings`;
                        fs.writeFileSync(infoPlistFileName, data, { flag: 'w' }, (e) => {
                            if (e) console.log(e);
                        });
                        fs.writeFileSync(fileName2, data, { flag: 'w' }, (e) => {
                            if (e) console.log(e);
                        });
                        fs.writeFileSync(infoPlistFileName2, data, { flag: 'w' }, (e) => {
                            if (e) console.log(e);
                        });
                    }
                    if (platformName === PLATFORMS.android.name) {
                        if (lang === "en") {
                            fs.mkdirSync(`outputs/android/values`, { recursive: true })
                            fileName = `outputs/android/values/strings.xml`;
                        } else {
                            fs.mkdirSync(`outputs/android/values-${lang}`, { recursive: true })
                            fileName = `outputs/android/values-${lang}/strings.xml`;
                        }
                        let start = '<?xml version="1.0" encoding="utf-8" standalone="no"?>\n<resources>\n';
                        let close = '\n</resources>';
                        data = start + data + close;
                    }

                    fs.writeFileSync(fileName, data, { flag: 'w' }, (e) => {
                        if (e) console.log(e);
                    });

                }
            }

        })
    }

    function createDirectories() {

        fs.rmSync("outputs", { recursive: true } )

        for (var j in langCodes) {
            let lang = langCodes[j];

            fs.mkdirSync(`outputs`, {
                recursive: true
            })
            if (lang === "en") {
                fs.mkdirSync(`outputs/android/values`, {
                    recursive: true
                })
            } else {
                let alang = lang
                if (lang === "pt-BR") {
                    alang = "pt-rBR"
                } else if (lang === "ro") {
                    alang = "ro-rRO"
                }
                fs.mkdirSync(`outputs/android/values-${alang}`, {
                    recursive: true
                })
            }

            fs.mkdirSync(`outputs/ios/`, { recursive: true })

            if (iosOutType === IOS_OUT_TYPE.LIST) {

                fs.mkdirSync(`outputs/ios/${lang}.lproj`, {
                    recursive: true
                })
                fs.mkdirSync(`outputs/ios-plist/${lang}.lproj`, {
                    recursive: true
                })
            }
        }
    }
}

/*
NOTES
- New line automatically comes as \n from XLSX
*/



function shouldRenewCache() {
    if (fs.existsSync(fileName)) {
        //cacheDuration as minutes => miliseconds
        let maxAge = cacheDuration * 60 * 1000;
        const stats = fs.statSync(fileName);
        const lastModifiedTime = new Date(stats.mtime).getTime();
        const currentTime = Date.now();
        console.log(lastModifiedTime, currentTime, maxAge)
        if (currentTime - lastModifiedTime > maxAge) {
            return true
        } else {
            return false
        }
    } else {
        return true
    }
}

function renewCache() {

    return new Promise((resolve, reject) => {

        console.log('Renewing localization cache...', fileName)

        const file = fs.createWriteStream(fileName)

        https.get(documentUrl, response => {

            if (response.statusCode !== 200) {
                reject()
            }
            response.pipe(file);

            file.on('finish', () => {
                file.close(resolve);
                resolve()
            });

            file.on('error', err => {
                fs.unlink(fileName); // Delete the file on error
                reject()
            });
        })

    })

}