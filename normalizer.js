const PLATFORMS = require("./constants.js").PLATFORMS

// Replace All Method
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};


function normalizeStringValue(platform, lang, value) {
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
            return value
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
            return value
        default:
            return;
    }
}

module.exports = { normalizeStringValue };
