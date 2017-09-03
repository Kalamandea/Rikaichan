window.rikaichanWebEx = new class {
	constructor() {
		this.options = null;
		this.toggle = false;
		this.tabInfo = {};
		this.dataMessage = {};
		this.translator = new Translator();
		this.processMessage = this.processMessage.bind(this);
		this.messageTab = this.messageTab.bind(this);

		this.translator.prepare().then(optionsLoad).then(this.optionsSet.bind(this)).then(() => {
			//browser.commands.onCommand.addListener(this.onCommand.bind(this));
			//browser.runtime.onMessage.addListener(this.onMessage.bind(this));
			if (this.options.general.showGuide) {
				browser.tabs.create({url: chrome.extension.getURL('/bg/guide.html')});
			}
		});
		//window.addEventListener('load', this._onLoad, false);
		//var f = this.processMessage;
	}

	optionsSet(options) {
		// In Firefox, setting options from the options UI somehow carries references
		// to the DOM across to the background page, causing the options object to
		// become a "DeadObject" after the options page is closed. The workaround used
		// here is to create a deep copy of the options object.
		this.options = JSON.parse(JSON.stringify(options));

		if (!this.options.general.enable) {
			//browser.browserAction.setBadgeBackgroundColor({color: '#d9534f'});
			//browser.browserAction.setBadgeText({text: 'off'});
		} else if (!dictConfigured(this.options)) {
			//browser.browserAction.setBadgeBackgroundColor({color: '#f0ad4e'});
			//browser.browserAction.setBadgeText({text: '!'});
		} else {
			browser.browserAction.setBadgeText({text: ''});
		}
	}

/*
	onLoad(){
		window.removeEventListener('load', this.onLoad, false);
		window.addEventListener('unload', this.onUnload, false);
		// rcxConfig.load();
		// rcxConfig.addObserver();
		gBrowser.tabContainer.addEventListener('TabSelect', rcxMain._onTabSelected, false);
	}
	
	_onLoad(){
		// this.onLoad();
	}

	onUnload(){
		//this.removeObserver();
		//rcxConfig.removeObserver();

		//gBrowser.tabContainer.removeEventListener('TabSelect', this._onTabSelected, false);
		

		window.removeEventListener('unload', this._onUnload, false);
	}
	
	_onUnload(){
		console.log(this.onUnload);
		this.onUnload();
	}*/

	messageTab(tabs) {
		browser.tabs.sendMessage(tabs[0].id, this.dataMessage);
	}
	
	processMessage(request) {
		var icon;
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
}