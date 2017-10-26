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

function commandExec(command) {
    instRikai().onCommand(command);
}

function instRikai() {
    return chrome.extension.getBackgroundPage().rikaichanWebEx;
}

function instDb() {
    return instRikai().translator.database;
}

function fgBroadcast(action, params) {
    chrome.tabs.query({}, tabs => {
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {action: action, data: params}, () => null);
        }
    });
}

function fgOptionsSet(options) {
    fgBroadcast('optionsSet', options);
}

function setIcon(toggle){
    const icon = toggle ? "/img/Rikai_new_icon_on.png" : "/img/Rikai_new_icon_off.png";
    chrome.browserAction.setIcon({path: icon});
}

/*
 * Options
 */

function optionsSetDefaults(options) {
    //TODO modify options
    const defaults = {
        general: {
            enable: false,
            toolbarEnable: false,
            highlightText: true,
            tranAltTitle: true,
            selectedInLookupBar: true,
            enlargeSmallDocuments: false,
            showIconInStatusbar: true,
            skin:'blue',
            showMiniHelp: true,
            useDPR: false,
            PopDY: 25
        },
        menus: {
            toggleContentMenu: true
        },
        dictionaries: {'kanji':{"name":"kanji","title":"Kanji","version":"2.01.170301",isKanji: true,enabled:true}},
        dictOrder:['kanji'],
        dictOptions:{
            hideDef: false,
            hidEx: false,
            wpos: true,
            wpop: true,
            maxEntries:10,
            maxName:20
        },
        kanjiDictionary:{
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
        },
        clipboardAndSave:{
            snlf: 0,
            ssep: 0,
            smaxce: 7,
            smaxck: 1
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
    if(!options.dictOrder){
        options.dictOrder = defaults.dictOrder.slice(0);
    }
    //combine(options.dictOrder, defaults.dictOrder);
    combine(options.dictOptions, defaults.dictOptions);
    combine(options.kanjiDictionary, defaults.kanjiDictionary);

    return options;
}

function optionsLoad() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(null, store => resolve(store.options));
    }).then(optionsStr => {
        return optionsStr ? JSON.parse(optionsStr) : {};
    }).catch(error => {
        return {};
    }).then(options => {
        return optionsSetDefaults(options);
    });
}

function optionsSave(options) {
    return new Promise((resolve, reject) => {
        //localStorage.setItem('options',JSON.stringify(options));
        chrome.storage.local.set({options: JSON.stringify(options)}, resolve);
    }).then(() => {
        instRikai().optionsSet(options);
        fgOptionsSet(options);
    });
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
    })/*.then(responseText => {
        try {
            //return JSON.parse(responseText);
            return responseText;
        }
        catch (e) {
            return Promise.reject('invalid JSON response');
        }
    });*/
}

function jsonLoad(url) {
    return new Promise((resolve, reject) => {
        resolve(fileLoad(chrome.extension.getURL(url)).then(json=> {return json}));
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

function zipLoadDb(archive, termsLoaded) {
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