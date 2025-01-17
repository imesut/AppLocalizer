module.exports = { process };

const { PLATFORMS } = require("./constants.js");
const normalizer = require("./normalizer.js");
const IOS_TYPE = require("./constants.js").IOS_TYPE

function process(list, locales, ios_key, ios_type) {

    var template = {
        "sourceLanguage": "en",
        "strings": {},
        "version": "1.0"
    }

    const result = {};

    let strings = list.forEach(item => {
        const { ios_key } = item;

        if (!ios_key || ios_type === IOS_TYPE.LOCALIZATION && ios_key.startsWith("NS") || ios_type === IOS_TYPE.PLIST && !ios_key.startsWith("NS")) return;

        result[ios_key] = {
            extractionState: "migrated",
            localizations: {}
        };

        locales.forEach(locale => {
            if (item[locale]) {
                result[ios_key].localizations[locale] = {
                    stringUnit: {
                        state: "translated",
                        value: normalizer.normalizeStringValue(PLATFORMS.ios, locale, item[locale])
                    }
                };
            }
        });
    });

    template.strings = result
    return template
}

