window.rikaichanWebEx = new class {
	constructor() {
		this.options = null;
		// this.toggle = false;
		// this.dataMessage = {};
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

	onCommand(command, data) {
		if(command == 'toggle'){
			this.options.general.enable = !this.options.general.enable;
			optionsSave(this.options).then(() => {
				this.optionsSet(this.options);
                //TODO change
                fgBroadcast(this.options.general.enable ? "enable" : "disable", this.options.general.enable);
                setIcon(this.options.general.enable);
			});
		}
		if(command == 'options'){
			browser.runtime.openOptionsPage();
		}
		if(command == 'show-text'){
            fgBroadcast("show", data);
        }
	}

	onMessage(msg, sender, callback) {

		if (msg.action == 'word-search') {
			return this.translator.wordSearch(msg.text).then(e =>{
				if (e != null){
					e.html = this.translator.makeHtml(e);
				}
				return e;
			});
		}

		if (msg.action == 'load-skin'){
			return fileLoad(browser.extension.getURL('/css/skin/popup-' + this.options.general.skin + '.css')).then(css =>{
               return css;
			});
		}

		if((msg.action == 'insert-frame') && this.options.general.enable){
            fgBroadcast("enable", this.options.general.enable);
		}

        if (msg.action == 'data-next') {
            this.translator.selectNext();
            return {};
        }
        if (msg.action == 'data-select') {
            this.translator.select(msg.index);
            return {};
        }
        // console.log('text=', msg.text);
		// console.log('\nonContentMessage');
		// console.log('name=' + msg.name);
		// console.log('sync=' + msg.sync);
		// console.log('data=', msg.data);
		// console.log('target=', msg.target);
		// console.log('objects=', msg.objects);

		if (msg.action == 'translate') {
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
		if (msg.action == 'lookup-search') {
			//return this.translator.lookupSearch(msg.text);
		}

	}
}