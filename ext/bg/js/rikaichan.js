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

        if (this.options.clipboardAndSave.snlf === 1) text = text.replace(/\n/g, '\r\n');
        else if (this.options.clipboardAndSave.snlf === 2) text = text.replace(/\n/g, '\r');

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
    copyToClipboard(entries){
        let text = this.textPrep(entries, true);
        let c = document.getElementById('clipboard');
        c.textContent = text;
        let r = document.createRange();
        r.setStart(c,0);
        r.setEnd(c,c.childNodes.length);
        let s = document.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        document.execCommand('copy');
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
            fgBroadcast("enable", this.options.general.enable);
		}

        if (msg.action === 'data-next') {
            this.translator.selectNext();
            return {};
        }
        if (msg.action === 'data-select') {
            this.translator.select(msg.index);
            return {};
        }
        if(msg.action === 'copy'){
			this.copyToClipboard(msg.entries);
		}
        if(msg.action === 'save'){
            let text = this.textPrep(msg.entries, false);
            return Promise.resolve(text);
            //this.saveToFile(msg.entries);
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