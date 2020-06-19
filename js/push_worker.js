'use strict';
console.log("worker load");
var new_window_promise = false;

self.addEventListener('push', function(event) {
	var data = {};
	if (event.data) {
		data = event.data.json();
	}
	console.log('Received a push message', event, data);

	var title = data.title || "";
	var body = data.message || "unknown message";
	var icon = '/favicon.ico';
	var tag = data.tag || "";
	
	event.waitUntil(clients.matchAll({
		type: 'all',
		includeUncontrolled: true
	}).then(function(clientList){
		console.log(clientList);
		for (var i = 0; i < clientList.length; i++){
			console.log(clientList[i].focused);
			if (clientList[i].focused || clientList[i].visibilityState == "visible"){
				data.type = "push";
				console.log("post_message", i, data);
				clientList[i].postMessage(data);
			}
		}
		new_window_promise = new Promise(function(resolve) {
			setTimeout(resolve, 100);
		}).then(function(){
			if (new_window_promise){
				return self.registration.showNotification(title, {
					body:body,
					icon:icon,
					tag:tag,
					data:data
				});
			}
		});
		event.waitUntil(new_window_promise);
	}));
});

self.addEventListener('message', function(event) {
	console.log("message", event);
	if (event.data.type == "handled"){
		clearTimeout(new_window_promise);
		new_window_promise = false;
	} else if (event.data.type == "focus"){
		event.source.focus();
		clearTimeout(new_window_promise);
		new_window_promise = false;
	}
});

self.addEventListener('notificationclick', function(event) {
	console.log('On notification click: ', event);
	var data = event.notification.data;
	event.notification.close();

	// This looks to see if the current is already open and
	// focuses if it is
	var target = false;
	event.waitUntil(clients.matchAll({
		type: 'all',
		includeUncontrolled: true
	}).then(function(clientList) {
		//console.log(clientList);
		for (var i = 0; i < clientList.length; i++) {
			if (!target)
				target = clientList[i];
			data.type = "push";
			console.log("post_message", i, data);
			clientList[i].postMessage(data);
		}
		if (clients.openWindow){
			new_window_promise = new Promise(function(resolve) {
				setTimeout(resolve, 100);
			}).then(function() {
				if (new_window_promise){
					if (data.data && data.data.game_id){
						//console.log("open new window.");
						clients.openWindow('/game.php?game_id='+data.data.game_id);
					} else {
						if (target){
							//console.log("send focus message");
							target.postMessage({"type": "focus"});
						} else {
							clients.openWindow('/');
						}
					}
				}
			});
			event.waitUntil(new_window_promise);
		}
	}));
});

function isClientFocused() {
	return clients.matchAll({
		type: 'window',
		includeUncontrolled: true
	}).then((windowClients) => {
		let clientIsFocused = false;
		
		for (let i = 0; i < windowClients.length; i++) {
			const windowClient = windowClients[i];
			if (windowClient.focused) {
				clientIsFocused = windowClient;
				break;
			}
		}
		
		return clientIsFocused;
	});
}