/*
 *
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
 * General
 */

function formRead() {
    return optionsLoad().then(optionsOld => {
        const optionsNew = {}; /*= $.extend(true, {}, optionsOld);
        $('.dict-group').each((index, element) => {
            const dictionary = $(element);
            const title = dictionary.data('title');
            const priority = parseInt(dictionary.find('.dict-priority').val(), 10);
            const enabled = dictionary.find('.dict-enabled').prop('checked');
            optionsNew.dictionaries[title] = {priority, enabled};
        });*/
        return {optionsNew, optionsOld};
    });
}


function onOptionsChanged(e) {
    if (!e.originalEvent && !e.isTrigger) {
        return;
    }
}

/*$(document).ready(() => {
    handlebarsRegister();

    optionsLoad().then(options => {
        document.getElementById('dict-file').onchange = onDictionaryImport;

        //$('#dict-purge').click(onDictionaryPurge);
        //$('#dict-file').change(onDictionaryImport);

        dictionaryGroupsPopulate(options);
        //updateVisibility(options);
    });
});
*/

/*
 * Dictionary
 */

function dictionaryErrorShow(error) {
        let errorBar = document.getElementById('dict-error');
    if(error){
        errorBar.setAttribute('class', 'alert alert-danger');
        errorBar.getElementsByTagName('span')[0].innerHTML = error;
    }else{
        errorBar.setAttribute('class', 'alert alert-danger novisible');
    }
}

function dictionarySpinnerShow(show) {
    const spinner = document.getElementById('dict-spinner');
    if (show) {
        spinner.setAttribute('class', 'pull-right novisible');
    } else {
        spinner.setAttribute('class', 'pull-right novisible');
    }
}

function dictionaryGroupsSort() {
    const dictGroups = document.getElementById('dict-groups');
/*    const dictGroupChildren = dictGroups.children('.dict-group').sort((ca, cb) => {
        const pa = parseInt($(ca).find('.dict-priority').val(), 10);
        const pb = parseInt($(cb).find('.dict-priority').val(), 10);
        if (pa < pb) {
            return 1;
        } else if (pa > pb) {
            return -1;
        } else {
            return 0;
        }
    });

    dictGroups.append(dictGroupChildren);*/
}

function dictionaryGroupsPopulate(options) {
    dictionaryErrorShow(null);
    dictionarySpinnerShow(true);
    //TODO change order dict & add style to dict bar
    const dictGroups = document.getElementById('dict-groups');
    const dictWarning = document.getElementById('dict-warning');
    dictWarning.setAttribute('class','alert alert-warning');
    const dictList = options.dictionaries;
    for(dic in dictList){
        let dict = document.createElement('div');
        dict.innerHTML = dictList[dic].name;
        dict.setAttribute('class','panel dict');
        dictGroups.appendChild(dict);
    }

    /*
    return instDb().getDictionaries().then(rows => {
        if (rows.length === 0) {
            dictWarning.show();
        }

        for (const row of dictRowsSort(rows, options)) {
            const dictOptions = options.dictionaries[row.title] || {enabled: false, priority: 0};
            const dictHtml = handlebarsRender('dictionary.html', {
                title: row.title,
                version: row.version,
                revision: row.revision,
                priority: dictOptions.priority,
                enabled: dictOptions.enabled
            });

            dictGroups.append($(dictHtml));
        }

        //updateVisibility(options);

        $('.dict-enabled, .dict-priority').change(e => {
            dictionaryGroupsSort();
            onOptionsChanged(e);
        });
    }).catch(dictionaryErrorShow).then(() => dictionarySpinnerShow(false));*/
}

function onDictionaryPurge(e) {
    e.preventDefault();
/*
    dictionaryErrorShow(null);
    dictionarySpinnerShow(true);

    const dictControls = $('#dict-importer, #dict-groups').hide();
    const dictProgress = $('#dict-purge-progress').show();

    instDb().purge().catch(dictionaryErrorShow).then(() => {
        dictionarySpinnerShow(false);
        dictControls.show();
        dictProgress.hide();
        return optionsLoad();
    }).then(options => {
        options.dictionaries = {};
        optionsSave(options).then(() => dictionaryGroupsPopulate(options));
    });*/
}

function onDictionaryImport(e) {
    dictionaryErrorShow(null);
    dictionarySpinnerShow(true);

    const dictFile = document.getElementById('dict-file'); //$('#dict-file');
    const dictImporter =  document.getElementById('dict-file');
    dictImporter.setAttribute('style', 'display:none');
    const dictProgress = document.getElementById('dict-import-progress');
    dictProgress.setAttribute('class', '');
    const dictProgressBar = document.getElementById('dict-progress-bar');
    const setProgress = percent => dictProgressBar.setAttribute('style','width:'+percent+'%');// dictProgress.find('.progress-bar').css('width', `${percent}%`);
    const updateProgress = (total, current) => setProgress(current / total * 100.0);

    setProgress(0.0);

    optionsLoad().then(options => {
        return instDb().importDictionary(e.target.files[0], updateProgress).then(summary => {
            //TODO set dict order
            options.dictOrder.push(summary.title);
            options.dictionaries[summary.title] = summary;
            options.dictionaries[summary.title].enable = true;
            return optionsSave(options);
        }).then(() => dictionaryGroupsPopulate(options));
    }).catch(dictionaryErrorShow).then(() => {
        dictFile.value = '';
        dictionarySpinnerShow(false);
        dictProgress.setAttribute('class', 'novisible');
        dictImporter.setAttribute('style', '');
    });
}


optionsLoad().then(options => {
    document.getElementById('dict-file').onchange = onDictionaryImport;
    //TODO purge selec dict
    document.getElementById('dict-purge').onclick = onDictionaryPurge;

    dictionaryGroupsPopulate(options);
    //updateVisibility(options);
});