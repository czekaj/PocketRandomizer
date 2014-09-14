// Copyright (c) 2014 Lucas Czekaj
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Auth = {
	CONSUMER_KEY: '32210-4ca8d411325286c8f31157d5',
	REDIRECT_URI: chrome.extension.getURL('auth.html'),
	OAUTH_PATH: 'oauth/',

	getRequestCode: function() {
		var data = {
			consumer_key: Auth.CONSUMER_KEY,
			redirect_uri: Auth.REDIRECT_URI,
		};
		
		return PocketAPI.call(OAUTH_PATH + 'request', data).then(function(data) {
			return data.code;
		});
	},
	askUserForPermission: function(requestCode) {
	    localStorage['auth_request_code'] = requestCode;
	    var url = 'https://getpocket.com/auth/authorize' +
	      '?request_token=' + requestCode +
	      '&redirect_uri=' + Auth.REDIRECT_URI;
	    window.open(url);
	},
	onUserPermissionReceived: function() {
	    var requestCode = localStorage['auth_request_code'];
	    return Auth.getAccessToken(requestCode).then(function(data) {
	      localStorage.removeItem('auth_request_code');
	      localStorage['auth_access_token'] = data.access_token;
	      localStorage['auth_username'] = data.username;
	    });
	},
  	getAccessToken: function(requestCode) {
    	var params = {
      	consumer_key: Auth.CONSUMER_KEY,
      	code: requestCode,
    	};
    	return PocketAPI.call(OAUTH_PATH + 'authorize', params);
  	},		
	authNeeded: function() {
		console.log('auth_access_token=='+localStorage['auth_access_token'])
		return localStorage['auth_access_token'] == null;
		
	},		
}

var PocketAPI = {
	REQUEST_CODE: null,
	call: function(method, data) {
		return new Promise(function(resolve, reject) {
			var req = new XMLHttpRequest();
			req.onload = function() {
				if (req.status != 200) {
					reject(Error(req.statusText));
					return;
				}
				resolve(JSON.parse(req.responseText));
			};
			req.onerror = function() {
				reject(Error("XHR error"));
			};
			req.open("POST", 'https://getpocket.com/v3/' + method);
			req.setRequestHeader('X-Accept', 'application/json');
			req.setRequestHeader('Content-Type', 'application/json; charset=UTF8');
			req.send(JSON.stringify(data));
		});
	},


	randomize: function() {
		if (Auth.authNeeded())
		{
			console.log('auth needed')
			Auth.getRequestCode().then(function(code){
				localStorage['auth_request_code'] = code;
				Auth.askUserForPermission(code);
				console.log('username_after_auth='+localStorage['auth_username'])
			})
		}
		else
		{
			console.log('username_no_auth=' + localStorage['auth_username']);
			console.log('randomizing!');
			var randomizing_params = {
				consumer_key: Auth.CONSUMER_KEY,
				access_token: localStorage['auth_access_token'],
				offset: Math.floor((Math.random() * 700) + 1),
				count: 1
			};
			PocketAPI.call('get',randomizing_params).then(function(data){
				for (item in data.list)
				{
					var newURL = data.list[item].resolved_url
					console.log('url='+newURL)
					var newItemId = data.list[item].item_id;
					chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
					   function(tabs){
					      chrome.tabs.update(tabs[0].id, {url: 'http://getpocket.com/a/read/' + newItemId});
					  	});
				}
				
			})

		}
	},

}
