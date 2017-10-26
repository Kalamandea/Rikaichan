window.rikaichanWebEx = new class {
	constructor() {
		this.options = null;
		this.translator = new Translator();
		this.onMessage = this.onMessage.bind(this);
		this.onCommand = this.onCommand.bind(this);
		this.optionsSet = this.optionsSet.bind(this);

        optionsLoad().then(options =>{
        	this.optionsSet(options);
            this.translator.prepare().then(
                setIcon(options.general.enable)
			);
            chrome.commands.onCommand.addListener(this.onCommand.bind(this));
            chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
		});
	}

	getHelp(){
	    if (this.options.general.showMiniHelp){
            return "<table cellspacing=\"5\">\n" +
                "<tr><td cellspan=\"2\" style=\"font-weight:bold\">Rikaichan " + chrome.i18n.getMessage("helpCaption") + "</td></tr>\n" +
                "<tr><td style=\"padding-right:1em\">A</td><td>" + chrome.i18n.getMessage("helpAlternateLocation") + "</td></tr>\n" +
                "<tr><td style=\"padding-right:1em\">C</td><td>" + chrome.i18n.getMessage("helpCopyToClipboard") + "</td></tr>\n" +
                "<tr><td style=\"padding-right:1em\">S</td><td>" + chrome.i18n.getMessage("helpSaveToFile") + "</td></tr>\n" +
                "<tr><td style=\"padding-right:1em\">D</td><td>" + chrome.i18n.getMessage("helpHideDefinitions") + "</td></tr>\n" +
                "<tr><td style=\"padding-right:1em\">shift, enter, 1-9</td><td>"  + chrome.i18n.getMessage("helpSwitchDictionaries") +  "</td></tr>\n" +
                "<tr><td style=\"padding-right:1em\">B</td><td>" + chrome.i18n.getMessage("helpPreviousCharacter") + "</td></tr>\n" +
                "<tr><td style=\"padding-right:1em\">M</td><td>" + chrome.i18n.getMessage("helpNextCharacter") +" </td></tr>\n" +
                "<tr><td style=\"padding-right:1em\">N</td><td>" + chrome.i18n.getMessage("helpNextWord") + "</td></tr>\n" +
                "</table>";
        }
    }

	optionsSet(options) {
        this.options = JSON.parse(JSON.stringify(options));
        if(this.translator){
            this.translator.optionsSet(this.options);
        }
	}

    showText(text) {
        fgBroadcast("show", text);
    }
    textPrep(entries, clip){
        if ((!entries) || (entries.length === 0)) return null;

        let me = this.options.clipboardAndSave.smaxce;
        let mk = this.options.clipboardAndSave.smaxck;

        if (!entries.fromLB) mk = 1;

        let text = '';
        for (let i = 0; i < entries.length; ++i) {
            let e = entries[i];
            if (e.kanji) {
                if (mk-- <= 0) continue;
                text += this.translator.makeText(e, 1);
            }
            else {
                if (me <= 0) continue;
                text += this.translator.makeText(e, me);
                me -= e.data.length;
            }
        }

        if (parseInt(this.options.clipboardAndSave.snlf) === 1) text = text.replace(/\n/g, '\r\n');
        else if (parseInt(this.options.clipboardAndSave.snlf) === 2) text = text.replace(/\n/g, '\r');

        let sep = parseInt(this.options.clipboardAndSave.ssep);
        switch (sep) {
            case 0:
                sep = '\t';
                break;
            case 1:
                sep = ',';
                break;
            case 2:
                sep = ' ';
                break;
        }
        if (sep != '\t') return text.replace(/\t/g, sep);

        return text;
	}

	saveToFile(entries){
        let text = this.textPrep(entries, true);
        if(text == null) return;
        let data = new Blob([text], {type: 'text/plain'});
        chrome.downloads.download({
            url : window.URL.createObjectURL(data),
            filename : 'rikaichan.txt',
            conflictAction : 'uniquify'
        }).then(null, (e)=>{console.log(e)});
    }

	onCommand(command, data) {
		if(command === 'toggle'){
			this.options.general.enable = !this.options.general.enable;
			optionsSave(this.options).then(opt => {
				this.optionsSet(this.options);
                fgBroadcast(this.options.general.enable ? "enable" : "disable", this.getHelp());
                setIcon(this.options.general.enable);
			});
		}
		if(command === 'options'){
			chrome.runtime.openOptionsPage();
		}
		if(command === 'show-text'){
            fgBroadcast("show", data);
        }
        if(command === 'toolbar'){
            fgBroadcast("toolbar", this.options.general.toolbarEnable);
        }
	}

    onMessage(msg, sender, sendRespons) {
        // console.log('text=', msg.text);
        // console.log('\nonContentMessage');
        // console.log('name=' + msg.action);
        // console.log('sync=' + msg.index);
        // console.log('data=', msg.entries);
        switch (msg.action){
            case "word-search":
                this.translator.wordSearch(msg.text).then(e =>{
                   sendRespons(e);
                });
                break;
            case "data-next":
                this.translator.selectNext();
                sendRespons(true);
                break;
            case "data-select":
                this.translator.select(msg.index);
                sendRespons(true);
                break;
            case "save":
                this.saveToFile(msg.entries);
                break;
            case "get-format-text":
                let text = this.textPrep(msg.entries, false);
                sendRespons(text);
                break;
            case "lookup-search":
                this.translator.lookupSearch(msg.text).then(r=>{
                    sendRespons(r);
                });
                break;
            case "translate":
                this.translator.translate(msg.text).then(e => {
                    if (e != null) {
                        e.title = msg.text.substr(0, e.textLen).replace(/[\x00-\xff]/g, function (c) {
                            return ('&#' + c.charCodeAt(0) + ';');
                        });
                        if (msg.text.length > e.textLen) e.title += '...';
                        e.html = this.translator.makeHtml(e);
                    }
                    return e;
                });
                break;
            case "insert-frame":
                if(this.options.general.enable){
                    fgBroadcast("enable", this.getHelp());
                }
                break;
            case "load-options":
                fgOptionsSet(this.options);
                break;
            case "load-skin":
                fileLoad(chrome.extension.getURL('/css/skin/popup-' + this.options.general.skin + '.css')).then(cssFile =>{
                    sendRespons({skin:this.options.general.skin, css:cssFile});
                });
       }
       return true;
	}
};