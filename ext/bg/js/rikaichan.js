window.rikaichanWebEx = new class {
	constructor() {
		this.options = null;
		this.toggle = false;
		this.tabInfo = {};
		this.dataMessage = {};
		this.translator = new Translator();
		this.processMessage = this.processMessage.bind(this);
		this.testTranslate = this.testTranslate.bind(this);
		this.messageTab = this.messageTab.bind(this);

		this.translator.prepare().then(optionsLoad).then(this.optionsSet.bind(this)).then(() => {
			//browser.commands.onCommand.addListener(this.onCommand.bind(this));
			browser.runtime.onMessage.addListener(this.onMessage.bind(this));
			if (this.options.general.showGuide) {
				//browser.tabs.create({url: chrome.extension.getURL('/bg/guide.html')});
			}
		});

		rcxConfig.load();
	}

	optionsSet(options) {
		// In Firefox, setting options from the options UI somehow carries references
		// to the DOM across to the background page, causing the options object to
		// become a "DeadObject" after the options page is closed. The workaround used
		// here is to create a deep copy of the options object.
		this.options = JSON.parse(JSON.stringify(options));

		if (!this.options.general.enable) {
			//browser.browserAction.setBadgeText({text: 'off'});
		} else if (!dictConfigured(this.options)) {
			//browser.browserAction.setBadgeText({text: '!'});
		} else {
			browser.browserAction.setBadgeText({text: ''});
		}
	}

	messageTab(tabs) {
		browser.tabs.sendMessage(tabs[0].id, this.dataMessage);
	}
	
	processMessage(request) {
		let icon;
		this.toggle = !this.toggle;
		icon = this.toggle ? "/img/Rikai_new_icon_on.png" : "/img/Rikai_new_icon_off.png";
		browser.browserAction.setIcon({tabId: this.tabInfo.id, path: icon});
		this.dataMessage.action = this.toggle ? "enable" : "disable";
		var querying = browser.tabs.query({
			active: true,
			currentWindow: true
		});
		querying.then(this.messageTab);
	}

	testTranslate(){
		let ent = {};
		this.translator.database.findTerms('嚔','eng').then(definitions => {ent['testT'] = definitions});
		ent.test= 'fgdsff';
		console.log(ent);
//		this.tabInfo;
	}



	onMessage({action, params}, sender, callback) {
		// TODO: allow setting index, return index
		if (msg.data.action == 'word-search') {
			let e = rcxData.wordSearch(msg.data.text);
			if (e != null) {
				e.html = rcxData.makeHtml(e);
			}
			return e;
		}

		// console.log('\nonContentMessage');
		// console.log('name=' + msg.name);
		// console.log('sync=' + msg.sync);
		// console.log('data=', msg.data);
		// console.log('target=', msg.target);
		// console.log('objects=', msg.objects);

		if (msg.data.action == 'translate') {
			let e = rcxData.translate(msg.data.text);
			if (e != null) {
				e.title = msg.data.text.substr(0, e.textLen).replace(/[\x00-\xff]/g, function (c) { return '&#' + c.charCodeAt(0) + ';' } );
				if (msg.data.text.length > e.textLen) e.title += '...';
				e.html = rcxData.makeHtml(e);
			}
			return e;
		}

		// TODO: allow setting index, return index
		if (msg.data.action == 'lookup-search') {
			return rcxData.lookupSearch(msg.data.text);
		}

	}
}