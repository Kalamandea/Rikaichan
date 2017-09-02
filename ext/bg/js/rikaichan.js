window.rikaichanWebEx = new class {
	constructor() {
		this.options = null;
		this.toggle = false;
		this.tabInfo = {};
		this.dataMessage = {};
		this.translator = new Translator();
		this.processMessage = this.processMessage.bind(this);
		this.messageTab = this.messageTab.bind(this);
		//window.addEventListener('load', this._onLoad, false);
		//var f = this.processMessage;
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