window.rikaichanWebEx = new class {
	constructor() {
		this.options = null;
		this.toggle = false;
		this.tabInfo = {};
		this.dataMessage = {};
		this.processMessage = this.processMessage.bind(this);
		this.messageTab = this.messageTab.bind(this);
		window.addEventListener('load', this._onLoad, false);
		var f = this.processMessage;
		// browser.browserAction.onClicked.addListener(f);
		// this.st = browser.storage;
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
	
	onGot(tabInfo) {
		rikaichanWebEx.tabInfo.id = tabInfo.id;
		console.log(this.tabInfo);
	}
	
	messageTab(tabs) {
		browser.tabs.sendMessage(tabs[0].id, this.dataMessage);
	}
	
	// processMessage(request, sender, sendResponse) {
	processMessage(request) {
		var icon;
		// var g = this.onGot;
		// var gettingCurrent = browser.tabs.getCurrent().then(this.onGot);		
		//gettingCurrent.then(g, null);
		// console.log(browser.storage);
		this.toggle = !this.toggle;
		icon = this.toggle ? "/img/toggle32on.png" : "/img/toggle32off.png";
		browser.browserAction.setIcon({tabId: this.tabInfo.id, path: icon});
		this.dataMessage.action = this.toggle ? "enable" : "disable";
		var querying = browser.tabs.query({
			active: true,
			currentWindow: true
		});
		querying.then(this.messageTab);
	}
}