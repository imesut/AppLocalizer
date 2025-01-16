

// npm run localizer -f Localization.xlsx -p ios/android/web/backend/all -cache_duration 1440/any_minute/0 -document_url xlsxFileUrl

// Requirements

let XLSX = require('xlsx');
let fs = require('fs');
// var https = require('https');
const {
    http,
    https
} = require('follow-redirects');

const args          = process.argv
const fileNameIndex = args.indexOf("-f")
const platformIndex = args.indexOf("-p")
const cacheIndex    = args.indexOf("-cache_duration")
const documentIndex = args.indexOf("-document_url")

// console.log(args)

const PLATFORMS = {
    ios: {
        name: "ios",
        key: "ios_key"
    },
    ios_infoplist: {
        name: "ios_infoplist",
        key: "ios_infoplist_key"
    },
    android: {
        name: "android",
        key: "android_key"
    },
    web: {
        name: "web",
        key: "web_key"
    },
    backend: {
        name: "backend",
        key: "backend_key"
    }
}

let documentUrl   = documentIndex > 0 && args[documentIndex + 1] !== undefined ? args[documentIndex + 1] : "https://docs.google.com/spreadsheets/d/e/2PACX-1vR.....B00gysnvSqjzeb592gkE/pub?output=xlsx"
let fileName      = fileNameIndex > 0 && args[fileNameIndex + 1] !== undefined ? args[fileNameIndex + 1] : "Localization.xlsx"
let platform      = platformIndex > 0 && args[platformIndex + 1] !== undefined ? args[platformIndex + 1] : "all"
let cacheDuration = cacheIndex    > 0 && args[cacheIndex + 1]    !== undefined ? args[cacheIndex + 1]    : 1440


// Replace All Method
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};


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
    let platformNamesForSeparateFileLocalizations = [PLATFORMS.android.name, PLATFORMS.ios.name, PLATFORMS.ios_infoplist.name]

    let headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0]
    let langCodes = headers.filter(name => !name.endsWith("_key"))

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
            if (!!row[PLATFORMS.ios.key]) {
                if (String(row[PLATFORMS.ios.key]).startsWith("NS")) {
                    console.log("NSKEY", row[PLATFORMS.ios.key], langCode)
                    resource.ios_infoplist[langCode] += processText(PLATFORMS.ios_infoplist, langCode, row[PLATFORMS.ios.key], row[langCode], lastElem);
                } else {
                    resource.ios[langCode] += processText(PLATFORMS.ios, langCode, row[PLATFORMS.ios.key], row[langCode], lastElem);
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
                if (lang === "ar") {
                    // This dirty hack will be solved as {{O-n}} & {{O}} replacement rather than {{0-n}} {{0}}
                    value = value.replaceAll('\{\{(O-)([0-9])\}\}', '%$2$d'); //{{O-n}}
                    value = value.replaceAll('\{\{(0-)([0-9])\}\}', '%$2$d'); //{{0-n}}
                    value = value.replaceAll('\{\{(A-)([0-9])\}\}', '%$2$s'); //{{A-n}}
                    value = value.replaceAll('\{\{(0)\}\}', '%d'); //{{0}}
                    value = value.replaceAll('\{\{(A)\}\}', '%s'); // {{A}}
                } else {
                    value = value.replaceAll('\{\{(0-)([0-9])\}\}', '%$2$d'); //{{0-n}}
                    value = value.replaceAll('\{\{(A-)([0-9])\}\}', '%$2$s'); //{{A-n}}
                    value = value.replaceAll('\{\{(0)\}\}', '%d'); //{{0}}
                    value = value.replaceAll('\{\{(A)\}\}', '%s'); // {{A}}
                }
                value = value.replaceAll("'", String.fromCharCode(92) + "'");
                value = value.replaceAll('"', String.fromCharCode(92) + '"');
                return `<string name="${key}">${value}</string>\n`;
            case PLATFORMS.ios_infoplist.name:
            case PLATFORMS.ios.name:
                if (lang === "ar") {
                    // This dirty hack will be solved as {{O-n}} & {{O}} replacement rather than {{0-n}} {{0}}
                    value = value.replaceAll('\{\{(O-)([0-9])\}\}', 'arabicparam:%$2$d'); //{{O-n}}
                    value = value.replaceAll('\{\{(O)([0-9])\}\}', 'arabicparam:%$2$d'); //{{O-n}}
                    value = value.replaceAll('\{\{(0-)([0-9])\}\}', 'arabicparam:%$2$d%'); //{{0-n}}
                    value = value.replaceAll('\{\{(A-)([0-9])\}\}', 'arabicparam:%$2$@'); //{{A-n}} 
                } else {
                    value = value.replaceAll('\{\{(0-)([0-9])\}\}', '%$2$d'); //{{0-n}}
                    value = value.replaceAll('\{\{(A-)([0-9])\}\}', '%$2$@'); //{{A-n}} 
                }
                value = value.replaceAll('\{\{(0)\}\}', '%d'); //{{0}}
                value = value.replaceAll('\{\{(O)\}\}', '%d'); //{{0}}
                value = value.replaceAll('\{\{(A)\}\}', '%@'); //{{A}}                    
                value = value.replaceAll('"', String.fromCharCode(92) + '"');
                return `"${key}" = "${value}";\n`;
            default:
                return;
        }
    }

    writeFiles();

    fs.writeFileSync("outputs/backend.json", JSON.stringify(backendList, null, 4), { flag: 'w' }, (e) => {
        if (e) console.log(e);
    });

    fs.writeFileSync("outputs/web.json", JSON.stringify(webList, null, 4), { flag: 'w' }, (e) => {
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

                    console.log(data)

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
            fs.mkdirSync(`outputs/ios/${lang}.lproj`, {
                recursive: true
            })
            fs.mkdirSync(`outputs/ios-plist/${lang}.lproj`, {
                recursive: true
            })
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