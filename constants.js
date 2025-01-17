
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

const IOS_TYPE = {
    LOCALIZATION : "LOCALIZATION",
    PLIST : "PLIST"
}

const IOS_OUT_TYPE = {
    CATALOG : "catalog",
    LIST : "list"
}

module.exports = { PLATFORMS, IOS_TYPE, IOS_OUT_TYPE }