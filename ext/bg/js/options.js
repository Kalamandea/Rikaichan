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

let dictList = {};
let dictOrder = [];

function formRead(e) {
    return optionsLoad().then(optionsOld => {
        // const optionsNew = Object.assign({}, optionsOld);
        const optionsNew = JSON.parse(JSON.stringify(optionsOld));
        optionsNew.dictOrder = dictOrder.slice(0);


        let gr = e.target.id.split(".");
        console.log(gr);
        switch (e.target.type){
            case "checkbox":
                optionsNew[gr[0]][gr[1]] = e.target.checked;
                break;
            case "number":
            case "select-one":
                optionsNew[gr[0]][gr[1]] = e.target.value;
                break;
        }
        return {optionsNew, optionsOld};
    });
}


function onOptionsChanged(e) {
    /*if (!e.originalEvent && !e.isTrigger) {
        return;
    }*/

    formRead(e).then(({optionsNew, optionsOld}) => {
        return optionsSave(optionsNew);
    });
}

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

function dictionaryDrawGroups(options) {
    dictionaryErrorShow(null);
    dictionarySpinnerShow(true);
    //TODO change order dict & add style to dict bar
    const dictGroups = document.getElementById('dict-groups');
    const dictWarning = document.getElementById('dict-warning');


    if (dictOrder.length > 0) {
        dictGroups.setAttribute('class', 'dict-groups');
        dictWarning.setAttribute('class','alert alert-warning novisible');
    }else{
        dictGroups.setAttribute('class', 'dict-groups novisible');
        dictWarning.setAttribute('class','alert alert-warning');
    }
    dictGroups.innerHTML = '';
    let i = 0;
    for(const dic of dictOrder){
        let dict = document.createElement('div');
        dict.innerHTML = '<div class="col-md-5" style="padding:5px 0"><h4>' + dictList[dic].title + '\t<small>&nbsp v' + dictList[dic].version + '</small></h4></div>';
        dict.setAttribute('class','panel dict');
        dict.setAttribute('data-order',i++);
        let up = document.createElement('button');
        up.innerHTML='&#8896;';
        up.setAttribute('class','btn');
        up.onclick = upDictOrder;
        let down = document.createElement('button');
        down.innerHTML='&#8897;';
        down.setAttribute('class','btn');
        down.onclick = downDictOrder;
        dict.appendChild(up);
        dict.appendChild(down);
        dictGroups.appendChild(dict);
    }
    dictionarySpinnerShow(false);
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
        optionsSave(options).then(() => dictionaryDrawGroups(options));
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
            options.dictOrder.push(summary.name);
            options.dictionaries[summary.name] = summary;
            options.dictionaries[summary.name].enable = true;
            dictOrder = options.dictOrder.slice(0);
            dictList = Object.assign({}, options.dictionaries);
            return optionsSave(options);
        }).then(() => {
            dictionaryDrawGroups(options);
            onOptionsChanged();
        });
    }).catch(dictionaryErrorShow).then(() => {
        dictFile.value = '';
        dictionarySpinnerShow(false);
        dictProgress.setAttribute('class', 'novisible');
        dictImporter.setAttribute('style', '');
    });
}

function upDictOrder(e) {
    let orderNum = parseInt(e.target.parentNode.getAttribute('data-order'));
    if(orderNum == 0)
        return;
    let p = dictOrder[orderNum-1];
    dictOrder[orderNum-1] = dictOrder[orderNum];
    dictOrder[orderNum] = p;
    dictionaryDrawGroups();
    onOptionsChanged(e);
}

function downDictOrder(e) {
    let orderNum = parseInt(e.target.parentNode.getAttribute('data-order'));
    if(orderNum == dictOrder.length-1)
        return;
    let p = dictOrder[orderNum+1];
    dictOrder[orderNum+1] = dictOrder[orderNum];
    dictOrder[orderNum] = p;
    dictionaryDrawGroups();
    onOptionsChanged(e);
}

optionsLoad().then(options => {
    document.getElementById('dict-file').onchange = onDictionaryImport;
    //TODO load & save all options
    //TODO purge select dict
    dictOrder = options.dictOrder.slice(0);
    dictList = Object.assign({},options.dictionaries);
    for(const group in options){
        if (group == 'general' || group == 'dictOptions' || group == 'kanjiDictionary'){
            for (const pref in options[group]){
                let el = document.getElementById(group+'.'+pref);
                if(el==null){
                    continue;
                }
                switch (typeof(options[group][pref])){
                    case "boolean":
                        el.checked = options[group][pref];
                        break;
                    case "number":
                        el.value = options[group][pref];
                        break;
                }
            }
        }
    }

    document.getElementById('dict-purge').onclick = onDictionaryPurge;
    document.getElementById('options-form').onchange = onOptionsChanged;
    dictionaryDrawGroups(options);
});