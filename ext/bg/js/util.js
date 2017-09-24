/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


/*
 * Promise
 */

function promiseCallback(promise, callback) {
    return promise.then(result => {
        callback({result});
    }).catch(error => {
        callback({error});
    });
}


/*
 * Japanese
 */

function jpIsKanji(c) {
    const code = c.charCodeAt(0);
    return code >= 0x4e00 && code < 0x9fb0 || code >= 0x3400 && code < 0x4dc0;
}

function jpIsKana(c) {
    return wanakana.isKana(c);
}


/*
 * Commands
 */

function commandExec(command) {
    instRikai().onCommand(command);
}


/*
 * Instance
 */

function instRikai() {
    return browser.extension.getBackgroundPage().rikaichanWebEx;
}

function instDb() {
    return instRikai().translator.database;
}

/*
 * Foreground
 */

function fgBroadcast(action, params) {
    browser.tabs.query({}, tabs => {
        for (const tab of tabs) {
            browser.tabs.sendMessage(tab.id, {action: action, data: params}, () => null);
        }
    });
}

function fgOptionsSet(options) {
    fgBroadcast('optionsSet', options);
}

function setIcon(toggle){
    const icon = toggle ? "/img/Rikai_new_icon_on.png" : "/img/Rikai_new_icon_off.png";
    browser.browserAction.setIcon({path: icon});
}

/*
 * Options
 */

function optionsSetDefaults(options) {
    const defaults = {
        general: {
            enable: false,
            highlightText: true,
            tranAltTitle: true,
            selectedInLookupBar: true,
            enlargeSmallDocuments: false,
            showIconInStatusbar: true,
            skin:'blue',
            showMiniHelp: true,
            useDPR: false,
            PopDY: 20
        },

        menus: {
            toggleContentMenu: true,
            lookupBarContentMenu: false,
            toggleToolsMenu: true,
            lookupToolsMenu: true
        },

        dictionaries: {},
        // dictOrder:['rus','eng'],
        //TODO order
        dictOrder:['eng'],
        dictOptions:{
            hideDef: false,
            hidEx: false,
            wos: true,
            wpop: true,
            maxEntries:10,
            maxName:20
        },
        kanjiDictionary:[
            'COMP','H','L','E','DK','N','V','Y','P','IN','I','O'
        ],

        kanjiDictionaryObj:{
            COMP:true,
            H:true,
            L:true,
            E:true,
            DK:true,
            N:true,
            V:true,
            Y:true,
            P:true,
            IN:true,
            I:true,
            U:true
        }


    };

    const combine = (target, source) => {
        for (const key in source) {
            if (!target.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
    };

    combine(options, defaults);
    combine(options.general, defaults.general);
    combine(options.menus, defaults.menus);
    combine(options.dictOrder, defaults.dictOrder);
    combine(options.dictOptions, defaults.dictOptions);
    combine(options.kanjiDictionary, defaults.kanjiDictionary);
    combine(options.kanjiDictionaryObj, defaults.kanjiDictionaryObj);

    return options;
}

function optionsVersion(options) {
    const fixups = [
        () => {},
        () => {},
        () => {},
        () => {},
        () => {
            if (options.general.audioPlayback) {
                options.general.audioSource = 'jpod101';
            } else {
                options.general.audioSource = 'disabled';
            }
        },
        () => {
            options.general.showGuide = false;
        },
        () => {
            if (options.scanning.requireShift) {
                options.scanning.modifier = 'shift';
            } else {
                options.scanning.modifier = 'none';
            }
        }
    ];

    optionsSetDefaults(options);
    if (!options.hasOwnProperty('version')) {
        options.version = fixups.length;
    }

    while (options.version < fixups.length) {
        fixups[options.version++]();
    }

    return options;
}

function optionsLoad() {
    return new Promise((resolve, reject) => {
        browser.storage.local.get(null, store => resolve(store.options));
    }).then(optionsStr => {
        return optionsStr ? JSON.parse(optionsStr) : {};
    }).catch(error => {
        return {};
    }).then(options => {
        return optionsVersion(options);
    });
}

function optionsSave(options) {
    return new Promise((resolve, reject) => {
        browser.storage.local.set({options: JSON.stringify(options)}, resolve);
    }).then(() => {
        instRikai().optionsSet(options);
        fgOptionsSet(options);
    });
}


/*
 * Dictionary
 */

function dictEnabledSet(options) {
    const dictionaries = {};
    for (const title in options.dictionaries) {
        const dictionary = options.dictionaries[title];
        if (dictionary.enabled) {
            dictionaries[title] = dictionary;
        }
    }

    return dictionaries;
}

function dictConfigured(options) {
    for (const title in options.dictionaries) {
        if (options.dictionaries[title].enabled) {
            return true;
        }
    }

    return false;
}

/*
 * Json/File
 */


function fileLoad(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.overrideMimeType('application/json');
        xhr.addEventListener('load', () => resolve(xhr.responseText));
        xhr.addEventListener('error', () => reject('failed to execute network request'));
        xhr.open('GET', url);
        xhr.send();
    }).then(responseText => {
        try {
            //return JSON.parse(responseText);
            return responseText;
        }
        catch (e) {
            return Promise.reject('invalid JSON response');
        }
    });
}

function jsonLoad(url) {
    return new Promise((resolve, reject) => {
        resolve(fileLoad(browser.extension.getURL(url)).then(json=> {return json}));
        reject('failed to execute network request');
    }).then(file => {return JSON.parse(file)});
}


function readArray(name) {
    let a = this.read(name).split('\n');
    while ((a.length > 0) && (a[a.length - 1].length == 0)) a.pop();
    return a;
}

/*
 * Zip
 */

function zipLoadDb(archive, termsLoaded, kanjiLoaded) {
    return JSZip.loadAsync(archive).then(files => files.files).then(files => {
        const indexFile = files['index.json'];
        if (!indexFile) {
            return Promise.reject('no dictionary index found in archive');
        }
		let index = {};
        return indexFile.async('string').then(indexJson => {
            index = JSON.parse(indexJson);
            if (!index.title) {
                return Promise.reject('unrecognized dictionary format');
            }
            return index
        }).then(index =>{
            console.log(index);
            const dict = files['Dict.json'];
            if (!dict) {
                return Promise.reject('missing Dictionary file');
            }
            const loaders = [];
            loaders.push(() => dict.async('string').then(dictJson => {
                const lines = JSON.parse(dictJson);
                let banksLoaded = 0;
                return termsLoaded(index, lines, 1, banksLoaded++);
            }));

            let chain = Promise.resolve();
            for (const loader of loaders) {
                chain = chain.then(loader);
            }
            return chain;
        });
    });
}
