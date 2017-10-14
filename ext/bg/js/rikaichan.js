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
            browser.commands.onCommand.addListener(this.onCommand.bind(this));
            browser.runtime.onMessage.addListener(this.onMessage.bind(this));
		});
	}

	optionsSet(options) {
        this.options = JSON.parse(JSON.stringify(options));
        if(this.options.menus.toggleContentMenu){
            browser.menus.create({
                id: "rikaichan",
                title: browser.i18n.getMessage("extensionName"),
                contexts: ["all"]
            }, null);
            browser.menus.onClicked.addListener((info, tab) => {
                if (info.menuItemId === "rikaichan") {
                    commandExec('toggle')
                }
            });
        }else{
            browser.menus.remove('rikaichan');
        }
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
        browser.downloads.download({
            url : window.URL.createObjectURL(data),
            filename : 'rikaichan.txt',
            conflictAction : 'uniquify'
        }).then(null, (e)=>{console.log(e)});
    }

	onCommand(command, data) {
		if(command === 'toggle'){
			this.options.general.enable = !this.options.general.enable;
			Promise.all([optionsSave(this.options),fileLoad(browser.extension.getURL('/bg/minihelp.html'))]).then(([opt, file]) => {
				this.optionsSet(this.options);
                fgBroadcast(this.options.general.enable ? "enable" : "disable", file);
                setIcon(this.options.general.enable);
			});
		}
		if(command === 'options'){
			browser.runtime.openOptionsPage();
		}
		if(command === 'show-text'){
            fgBroadcast("show", data);
        }
        if(command === 'toolbar'){
            fgBroadcast("toolbar", this.options.general.toolbarEnable);
        }
	}

	onMessage(msg, sender, callback) {

		if (msg.action === 'word-search') {
			return this.translator.wordSearch(msg.text).then(e =>{
				if (e != null){
					e.html = this.translator.makeHtml(e);
				}
				return e;
			});
		}

		if (msg.action === 'load-skin'){
			return fileLoad(browser.extension.getURL('/css/skin/popup-' + this.options.general.skin + '.css')).then(cssFile =>{
               return {skin:this.options.general.skin, css:cssFile};
			});
		}

		if((msg.action === 'insert-frame') && this.options.general.enable){
            fileLoad(browser.extension.getURL('/bg/minihelp.html')).then(file =>{
                fgBroadcast("enable", file);
            });
		}

        if (msg.action === 'data-next') {
            this.translator.selectNext();
            return {};
        }
        if (msg.action === 'data-select') {
            this.translator.select(msg.index);
            return {};
        }
        if(msg.action === 'save'){
		    this.saveToFile(msg.entries);
        }
        if(msg.action === 'get-format-text'){
            let text = this.textPrep(msg.entries, false);
            return Promise.resolve(text);
        }
        // console.log('text=', msg.text);
		// console.log('\nonContentMessage');
		// console.log('name=' + msg.name);
		// console.log('sync=' + msg.sync);
		// console.log('data=', msg.data);
		// console.log('target=', msg.target);
		// console.log('objects=', msg.objects);

		if (msg.action === 'translate') {
			let e = this.translator.translate(msg.text).then(e => {
				if (e != null) {
					e.title = msg.text.substr(0, e.textLen).replace(/[\x00-\xff]/g, function (c) {
						return ('&#' + c.charCodeAt(0) + ';');
					});
					if (msg.text.length > e.textLen) e.title += '...';
					e.html = this.translator.makeHtml(e);
				}
                return e;
			});
		}

		//TODO add Lookup bar
		if (msg.action === 'lookup-search') {
			//return this.translator.lookupSearch(msg.text);
		}

	}
}