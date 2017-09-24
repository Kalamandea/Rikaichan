window.rikaichanWebEx = new class {
	constructor() {
		this.options = null;
		this.toggle = false;
		this.dataMessage = {};
		this.translator = new Translator();
		this.onMessage = this.onMessage.bind(this);

		this.translator.prepare().then(optionsLoad).then(this.optionsSet.bind(this)).then(() => {
			browser.commands.onCommand.addListener(this.onCommand.bind(this));
			browser.runtime.onMessage.addListener(this.onMessage.bind(this));
			setIcon(this.options.general.enable);
		});
	}

	optionsSet(options) {
		// In Firefox, setting options from the options UI somehow carries references
		// to the DOM across to the background page, causing the options object to
		// become a "DeadObject" after the options page is closed. The workaround used
		// here is to create a deep copy of the options object.
		this.options = JSON.parse(JSON.stringify(options));

		if (!dictConfigured(this.options)) {
			browser.browserAction.setBadgeBackgroundColor({color: '#f0ad4e'});
			browser.browserAction.setBadgeText({text: '!'});
		} else {
			browser.browserAction.setBadgeText({text: ''});
		}
	}

	//TODO Deprecated
	testTranslate(){
		let ent = {};
		this.translator.database.findWord('嚔','eng').then(definitions => {ent['testT'] = definitions});
		ent.test= 'fgdsff';
		console.log(ent);
	}

    showText(text) {
        fgBroadcast("show", text);
    }

	onCommand(command, data) {
		if(command == 'toggle'){
			this.options.general.enable = !this.options.general.enable;
			optionsSave(this.options).then(() => this.optionsSet(this.options));
            //TODO change
            fgBroadcast(this.options.general.enable ? "enable" : "disable", this.options.general.enable);
			setIcon(this.options.general.enable);
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
				e.test = 'test';
				return e;
			});

			/*let e = this.translator.wordSearch(msg.data.text);
			if (e != null) {
				e.html = this.translator.makeHtml(e);
			}
			return e;*/
		}

		if (msg.action == 'load-skin'){
			return fileLoad(browser.extension.getURL('/css/skin/popup-' + this.options.general.skin + '.css')).then(css =>{
               return css;
			});

		}

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

		if (msg.action == 'lookup-search') {
			//return this.translator.lookupSearch(msg.text);
		}

	}
}