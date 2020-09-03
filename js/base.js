"use strict";

var storage_location = "";
var modala_handle = "";
var has_internet = false;
var uuid = window.localStorage.getItem("site_uuid") || "comp_"+Math.floor(Math.random()*1000000).toString(16);
window.localStorage.setItem("site_uuid", uuid);
var active_start = Date.now();
var ad_manager = false;
var thePlatform = "";
var templates = {};
var inapp_purcheses = JSON.parse(window.localStorage.getItem("inapp_purcheses") || "{}");
var inapp_items = {removeads199:{id: "removeads199", alias: "Remove Ads", save: true, owned:function (re_run){
			if (!re_run)// && !store.is_loading)
				open_modal("Ads Removed!<i class='fa fa-thumbs-o-up'></i>", '<b>Thank you for supporting our small dev studio!</b>', false, false, "Ok", true);
			ad_manager.hide();
			$(".remove_paid").remove();
			$(".has_paid").show();
		}}};

String.prototype.ucfirst = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

function Settings(save_key, def_data){
	this.save_key = save_key || "settings_data";
	this.save_handle = false;
	
	this.data = JSON.parse(window.localStorage.getItem(this.save_key) || def_data || "{}");
	
	this.set = function (key, val){
		if (this.data[key] != val){
			this.data[key] = val;
			this.save();
		}
	};
	
	this.get = function (key){
		return this.data[key];
	};
	
	this.delete = function (key){
		delete this.data[key];
		this.save();
	};
	
	this.save = function (local_only){
		window.localStorage.setItem(this.save_key, JSON.stringify(this.data));
		if (!local_only){
			if (typeof save_settings != "undefined"){
				if (this.save_handle)
					clearTimeout(this.save_handle);
				this.save_handle = setTimeout(function (){
					save_settings();
				}, 10);
			}
		}
	};
}
window.settings = new Settings(false, '{"music": true, "effects": true, "animation": "zoom"}');

function Stats(){
	var scope = this;
	this.data = settings.get("stats_data") || {};
	
	this.save = function (){
		settings.set("stats_data", scope.data);
	};
	
	this.set = function (key, val){
		if (this.data[key] != val){
			this.data[key] = val;
			this.save();
		}
	};
	
	this.get = function (key){
		return this.data[key];
	};
	
	this.add = function (key, num){
		num = num || 1;
		if (this.data[key])
			this.data[key] += num;
		else
			this.data[key] = 1;
		this.save();
	};
}
window.stats = new Stats();

function register_touch_manager(){
	var last_touch = {x: 0, y:0, trigger:"", time: 0};
	window.set_touch = function (e, trigger){
		var touch = e.originalEvent.changedTouches[0];
		last_touch.trigger = trigger;
		last_touch.x = touch.screenX;
		last_touch.y = touch.screenY;
		last_touch.time = Date.now();
	};
	window.good_touch = function (e, trigger){
		var touch = e.originalEvent.changedTouches[0];
		
		if (Math.abs(last_touch.x - touch.screenX) < 10 && Math.abs(last_touch.y - touch.screenY) < 10 && trigger == last_touch.trigger){
			return true;
		}
		return false;
	};
	
	window.click_event = function(limiter, callback, target, no_prop){
		target = target || false;
		no_prop = no_prop || false;
		if (target){
			if (target === true)
				target = document;
			$(target).on("touchstart", limiter, function (e){
				set_touch(e, limiter);
				if (no_prop){
					e.stopPropagation();
					return false;
				}
			});
			$(target).on("touchend click_event", limiter, function (e){
				if (e.type != "click_event" && !good_touch(e, limiter))
					return;
				e.time = Date.now() - last_touch.time;
				e.long = e.time > 500;
				callback.call(e.currentTarget, e);
				if (no_prop){
					e.stopPropagation();
					return false;
				}
			});
		} else {
			$(limiter).on("touchstart", function (e){
				set_touch(e, limiter);
				if (no_prop){
					e.stopPropagation();
					return false;
				}
			});
			$(limiter).on("touchend click_event", function (e){
				if (e.type != "click_event" && !good_touch(e, limiter))
					return;
				e.time = Date.now() - last_touch.time;
				e.long = e.time > 500;
				callback.call(e.currentTarget, e);
				if (no_prop){
					e.stopPropagation();
					return false;
				}
			});
		}
	}
}
register_touch_manager();

function hide_keyboard() {
	//this set timeout needed for case when hideKeyborad
	//is called inside of "onfocus" event handler
	setTimeout(function() {
		$(":focus").blur();
		//creating temp field
		var field = document.createElement("input");
		field.setAttribute("type", "text");
		//hiding temp field from peoples eyes
		//-webkit-user-modify is nessesary for Android 4.x
		field.setAttribute("style", "position:absolute; top: 0px; opacity: 0; -webkit-user-modify: read-write-plaintext-only; left:0px;");
		document.body.appendChild(field);
		//adding onfocus event handler for out temp field
		field.onfocus = function(){
			field.setAttribute("style", "display:none;");
			setTimeout(function() {
				document.body.removeChild(field);
				document.body.focus();
			}, 14);
		};
		//focusing it
		field.focus();
	}, 50);
}

function dump(obj, name, pre, depth, ret){
	ret = ret || false;
	pre = pre || "";
	name = name || "";
	depth = typeof depth !== "undefined" ? depth : 2;
	var out = "";
	if (typeof obj == "object" && depth > 0){
		var prop = false;
		for (var i in obj) {
			prop = true;
			out += dump(obj[i], name, pre+"["+i+"] ", depth-1, ret);
		}
		if (prop)
			return out;
		else
			out = "{}";
	} else {
		out += pre + (typeof obj) + ": " + obj;
	}
	if (ret)
		return name+"; "+out;
	console.log(name+"; "+out);
}

function ret_dump(obj, depth){
	depth = typeof depth !== "undefined" ? depth : 1;
	return dump(obj, "", "", depth, true);
}

function argdump(){
	for (var i = 0; i < arguments.length; ++i)
		alert(ret_dump(arguments[i]));
}

function template(key, data){
	var dat = templates[key];
	if (!templates[key]){
		console.error("template '" + key + "' does not exist");
		return key;
	}
	for(var key in data){
		dat = dat.replace(new RegExp("##"+key+"##", "g"), data[key]);
		dat = dat.replace(new RegExp("{{"+key+"\\?([^}]*)}}", "gm"), "$1");
	}
	dat = dat.replace(new RegExp("{{[^}]*}}", "gm"), "");
	return dat;
}

function open_modal(options){
	options = $.extend({}, {content: "", title: "", callback: false, button1: "Ok", button2: false, overwrite: true, add_class: "", dismissible: false}, options || {});
	if (options.button2 === true)
		options.button2 = "Cancel";
	
	$("#modal h1").html(options.title);
	if (options.overwrite || !$("#modal").is(":visible")){
		$("#modal > div").html(options.content);
	} else {
		$("#modal > div").append("<br />"+options.content);
	}
	if (options.button1){
		$("#mbutton1").show().html(options.button1);
	} else {
		$("#mbutton1").hide();
	}
	if (options.button2){
		$("#mbutton1").removeClass("fullwidth");
		$("#mbutton2").show().html(options.button2);
	} else {
		$("#mbutton1").addClass("fullwidth");
		$("#mbutton2").hide();
	}
	$("#modal a").off().on("touchend", function (e){
		e.stopPropagation();
		if (!$(this).hasClass("no_close")){
			$("#modal").hide();
			$("#modal-overlay").removeClass("enabled");
			if (options.callback)
				options.callback($(this));
		}
	});
	$("#modal").attr("class", options.add_class).show();
	$("#modal-overlay").addClass("enabled");
	if (options.dismissible){
		$("#modal-overlay").off().on("touchend", function(e){
			close_modal()
		});
	}
}

function open_modala(text, dismiss, time){
	dismiss = dismiss || false;
	time = time || 10000;
	$("#modal h1").html(text);
	$("#modal").addClass("loading").css("display", "block");
	$("#modal-overlay").off().addClass("enabled");
	modala_handle = setTimeout(function (){
		close_modala();
	}, time);
	if (dismiss){
		$("#disable-overlay").on("touchend", function(e){
			close_modala();
		});
	}
}

function reopen_modal(){
	$("#modal").show();
	$("#modal-overlay").addClass("enabled");
}

function close_modal(){
	$("#modal").hide();
	$("#modal-overlay").removeClass("enabled");
}

function close_modala(){
	clearTimeout(modala_handle);
	$("#modal").hide().removeClass("loading");
	$("#modal-overlay").removeClass("enabled");
}

function track(catigory, action, label, value){
	if (typeof window.ga != "undefined"){
		catigory = catigory || "Hit";
		action = action || catigory;
		label = label || action;
		value = value || 1;
		window.ga.trackEvent(catigory, action, label, value);
	}
}

var splash_checks = 1;
function start_splash_remove(){
	console.log("splash_remove");
	--splash_checks;
	if (splash_checks <= 0 && navigator.splashscreen){
		console.log("splash_remove start");
		setTimeout(function () { navigator.splashscreen.hide(); console.log("splash_remove run"); }, 100);
	}
}



function chartboost_ads(){
	var scope = this;
	this.available = (typeof Chartboost != "undefined" || typeof window.chartboost != "undefined");
	this.loaded = false;
	this.failed_at = 0;
	this.active = false;
	this.priority = 1;
	this.id = "";
	this.key = "";
	
	this.init = function(){
		if (!this.loaded){
			this.loaded = true;
			this.id = chartboost_ios_id;
			this.key = chartboost_ios_key;
			if (thePlatform == "android"){
				this.id = chartboost_droid_id;
				this.key = chartboost_droid_key;
				window.chartboost.setUp(this.id, this.key);
			} else if (thePlatform == "ios"){
				Chartboost.createBanner({
					appId: this.id,
					appKey: this.key
				});
			}
		}
		return false;
	};
	
	this.hide = function(){
	};
	
	this.load_interstitial = function (){
		if (thePlatform == "android"){
			window.chartboost.preloadInterstitialAd("Default");
		} else {
			Chartboost.prepareInterstitial({adId: "interstitial/Home Screen", autoShow:false});
		}
		return true;
	};
	
	this.show_interstitial = function (){
		if (thePlatform == "android"){
			window.chartboost.showInterstitialAd("Default");
		} else {
			Chartboost.showInterstitial();
		}
	};
}

function admob_ads(){
	var scope = this;
	this.available = typeof window.plugins != "undefined" && typeof window.plugins.AdMob != "undefined";
	this.loaded = false;
	this.failed_at = 0;
	this.active = false;
	this.priority = 2;
	this.code = "";
	this.code_int = "";
	
	this.init = function(){
		if (!this.loaded){
			this.loaded = true;
			this.code = admob_code;
			this.code_int = admob_code_int;
			if (typeof admob_code_droid != "undefined" && thePlatform == "android"){
				this.code = admob_code_droid;
				this.code_int = admob_code_droid_int;
			}
			window.plugins.AdMob.setOptions({
				publisherId: this.code,
				interstitialAdId: this.code_int,
				bannerAtTop: false, // set to true, to put banner at top
				overlap: false, // set to true, to allow banner overlap webview
				offsetTopBar: false, // set to true to avoid ios7 status bar overlap
				isTesting: dev, // receiving test ad
				autoShow: false // auto show interstitial ad when loaded
			});
			
			document.addEventListener("onFailedToReceiveAd", function(data) {
				scope.failed_at = new Date().getTime();
				ad_manager.ad_fail("AdMob");
			});
			document.addEventListener("onReceiveAd", function(data){
				if (!ad_manager.hide_others("AdMob")){
					scope.hide();
				}
				scope.dshow();
			});
			window.addEventListener("orientationchange", function(){
				console.log(window.orientation);
			});
			window.plugins.AdMob.createBannerView();
		} else {
			this.dshow();
		}
		return true;
	};
	
	this.dshow = function (){
		var s = this;
		setTimeout(function (){
			s.show();
		}, 5000);
	};
	
	this.show = function(){
		console.log("admob try show");
		if (this.priority <= ad_manager.pri_active && !this.active){
			console.log("admob show");
			ad_manager.pri_active = this.priority;
			this.active = true;
			window.plugins.AdMob.createBannerView();
			setTimeout(function (){
				$(window).trigger('resize');
			}, 1000);
		}
	};
	
	this.hide = function(){
		console.log("admob try hide");
		if (this.active){
			console.log("admob hide");
			ad_manager.pri_active = 999;
			this.active = false;
			window.plugins.AdMob.destroyBannerView();
		}
	};
	
	this.load_interstitial = function (){
		window.plugins.AdMob.createInterstitialView();
		return true;
	};
	
	this.show_interstitial = function (){
		window.plugins.AdMob.showInterstitialAd(true,function(){},function(e){console.log(e);});
	};
}

function admobpro_ads(){
	var scope = this;
	this.available = typeof AdMob != "undefined";
	this.loaded = false;
	this.failed_at = 0;
	this.active = false;
	this.priority = 2;
	this.code = "";
	this.code_int = "";
	
	this.init = function(){
		if (!this.loaded){
			this.loaded = true;
			this.code = admob_code;
			this.code_int = admob_code_int;
			if (typeof admob_code_droid != "undefined" && thePlatform == "android"){
				this.code = admob_code_droid;
				this.code_int = admob_code_droid_int;
			}
			AdMob.createBanner({
				adId: this.code,
				adSize: "SMART_BANNER",
				position: AdMob.AD_POSITION.BOTTOM_CENTER,
				autoShow: false,
				isTesting: dev,
				adExtras: {color_bg: "333333"}
			});
			
			document.addEventListener("onBannerFailedToReceive", function(data) {
				scope.failed_at = new Date().getTime();
				ad_manager.ad_fail("AdMobPro");
			});
			document.addEventListener("onAdLoaded", function(data){
				if (!ad_manager.hide_others("AdMobPro")){
					scope.hide();
				}
				scope.dshow();
			});
		} else {
			this.dshow();
		}
		return true;
	};
	
	this.dshow = function (){
		var s = this;
		setTimeout(function (){
			s.show();
		}, 5000);
	};
	
	this.show = function(){
		console.log("admobpro try show");
		if (this.priority <= ad_manager.pri_active && !this.active){
			console.log("admobpro show");
			ad_manager.pri_active = this.priority;
			this.active = true;
			AdMob.showBanner(AdMob.AD_POSITION.BOTTOM_CENTER);
			setTimeout(function (){
				$(window).trigger("resize");
			}, 1000);
		}
	};
	
	this.hide = function(){
		console.log("admobpro try hide");
		if (this.active){
			console.log("admobpro hide");
			ad_manager.pri_active = 999;
			this.active = false;
			AdMob.hideBanner();
		}
	};
	
	this.load_interstitial = function (){
		AdMob.prepareInterstitial({adId:this.code_int, isTesting: dev, autoShow:false});
		return true;
	};
	
	this.show_interstitial = function (){
		AdMob.showInterstitial();
	};
}

function admob2_ads(){
	var scope = this;
	this.available = typeof admob != "undefined";
	this.loaded = false;
	this.failed_at = 0;
	this.active = false;
	this.priority = 2;
	this.code = "";
	this.code_int = "";
	
	this.init = function(){
		if (!this.loaded){
			this.loaded = true;
			this.code = admob_code;
			this.code_int = admob_code_int;
			if (typeof admob_code_droid != "undefined" && thePlatform == "android"){
				this.code = admob_code_droid;
				this.code_int = admob_code_droid_int;
			}
			
			admob.setOptions({
				publisherId: this.code,
				interstitialAdId: this.code_int,
				autoShowBanner: true,
				autoShowInterstitial: false,
				autoShowRewarded: false,
				isTesting: dev
			});
			
			document.addEventListener(admob.onAdFailedToLoad, function(data) {
				scope.failed_at = new Date().getTime();
				ad_manager.ad_fail("admob2");
			});
			document.addEventListener(admob.onAdLoaded, function(data){
				if (!ad_manager.hide_others("admob2")){
					scope.hide();
				}
				scope.dshow();
			});
			window.addEventListener("orientationchange", function(){
				console.log(window.orientation);
			});
			admob.createBannerView();
		} else {
			this.dshow();
		}
		return true;
	};
	
	this.dshow = function (){
		var s = this;
		setTimeout(function (){
			s.show();
		}, 5000);
	};
	
	this.show = function(){
		console.log("admob2 try show");
		if (this.priority <= ad_manager.pri_active && !this.active){
			console.log("admob2 show");
			ad_manager.pri_active = this.priority;
			this.active = true;
			admob.showBannerAd(true);
			setTimeout(function (){
				$(window).trigger('resize');
			}, 1000);
		}
	};
	
	this.hide = function(){
		console.log("admob2 try hide");
		if (this.active){
			console.log("admob2 hide");
			ad_manager.pri_active = 999;
			this.active = false;
			admob.showBannerAd(false);
		}
	};
	
	this.load_interstitial = function (){
		admob.requestInterstitialAd();
		return true;
	};
	
	this.show_interstitial = function (){
		admob.showInterstitialAd();
	};
}

function admob22_ads(){
	var scope = this;
	this.available = typeof admob != "undefined";
	this.loaded = false;
	this.failed_at = 0;
	this.active = false;
	this.priority = 2;
	this.code = "";
	this.code_int = "";
	
	this.init = function(){
		if (!this.loaded){
			this.loaded = true;
			this.code = admob_code;
			this.code_int = admob_code_int;
			if (typeof admob_code_droid != "undefined" && thePlatform == "android"){
				this.code = admob_code_droid;
				this.code_int = admob_code_droid_int;
			}
			
			admob.initAdmob(this.code, this.code_int);
			var params = new  admob.Params();
			params.isTesting = dev;
			admob.showBanner(admob.BannerSize.BANNER, admob.Position.BOTTOM_CENTER, params);
			
			document.addEventListener(admob.Event.onAdmobBannerFailedReceive, function(data) {
				scope.failed_at = new Date().getTime();
				ad_manager.ad_fail("admob2");
			});
			document.addEventListener(admob.Event.onAdmobBannerReceive, function(data){
				if (!ad_manager.hide_others("admob2")){
					scope.hide();
				}
				scope.dshow();
			});
			window.addEventListener("orientationchange", function(){
				console.log(window.orientation);
			});
			window.plugins.AdMob.createBannerView();
		} else {
			this.dshow();
		}
		return true;
	};
	
	this.dshow = function (){
		var s = this;
		setTimeout(function (){
			s.show();
		}, 5000);
	};
	
	this.show = function(){
		console.log("admob2 try show");
		if (this.priority <= ad_manager.pri_active && !this.active){
			console.log("admob2 show");
			ad_manager.pri_active = this.priority;
			this.active = true;
			var params = new  admob.Params();
			params.isTesting = dev;
			admob.showBanner(admob.BannerSize.BANNER, admob.Position.BOTTOM_CENTER, params);
			setTimeout(function (){
				$(window).trigger('resize');
			}, 1000);
		}
	};
	
	this.hide = function(){
		console.log("admob2 try hide");
		if (this.active){
			console.log("admob2 hide");
			ad_manager.pri_active = 999;
			this.active = false;
			admob.hideBanner()
		}
	};
	
	this.load_interstitial = function (){
		admob.cacheInterstitial();
		return true;
	};
	
	this.show_interstitial = function (){
		admob.showInterstitial();
	};
}

function house_ads(){
	this.available = false;
	this.loaded = false;
	this.failed_at = 0;
	this.active = false;
	this.priority = 3;
	
	this.init = function(){
		if (!this.loaded) {
			this.loaded = true;
		} else {
			this.show();
		}
		return false;
	};
	
	this.dshow = function (){
		var s = this;
		setTimeout(function (){
			s.show();
		}, 5000);
	};
	
	this.show = function(){
	};
	
	this.hide = function(){
	};
	
	this.load_interstitial = function (){
		return false;
	};
	
	this.show_interstitial = function (){
	};
}

function admanager() {
	this.ads = {"Chartboost": new chartboost_ads(), "admob2": new admob2_ads(), "AdMobPro": new admobpro_ads(), "AdMob": new admob_ads(), "house": new house_ads()};
	this.pri = ["Chartboost", "admob2", "AdMob", "AdMobPro", "house"];
	this.pri_active = 999;
	this.int_min_trig = 0;
	this.int_last_trig = 0;
	this.int_per_events = 0;
	this.int_trigs = -1;
	
	this.init = function(){
		console.log("ad manager startup");
		if (inapp_has("removeads199"))
			return;
		if (has_internet){
			this.ad_fail();
		}
	};
	
	this.ad_fail = function(who){
		who = who || false;
		console.log("ad_fail");
		if (who){
			console.log("ad_fail: "+who);
			this.ads[who].hide();
		}
		if (inapp_has("removeads199"))
			return;
		for (var i=0;i<this.pri.length;i++){
			var key = this.pri[i];
			console.log("ad check: "+key);
			if (key != who && this.ads[key].available && this.ads[key].failed_at < (new Date()).getTime()-100000){
				console.log("ad init: "+key);
				if (this.ads[key].init())
					return;
			}
		}
	};
	
	this.hide_others = function(who){
		if (this.ads[who].priority <= this.pri_active){
			for(var key in this.ads){
				if (key != who && this.ads[key].available){
					this.ads[key].hide();
					break;
				}
			}
			return true;
		} else {
			return false;
		}
	};
	
	this.hide = function (){
		for(var key in this.ads){
			this.ads[key].hide();
		}
	};
	
	this.show = function (){
		this.ad_fail();
	};
	
	this.load_interstitial = function (){
		console.log("load_interstitial");
		if (inapp_has("removeads199"))
			return false;
		if (this.int_per_events == -1){
			return;
		}
		for (var i=0;i<this.pri.length;i++){
			var key = this.pri[i];
			if (this.ads[key].available){
				console.log("load "+key+" interstitial");
				if (this.ads[key].load_interstitial())
					return key;
			}
		}
	};
	
	this.show_interstitial = function (key){
		console.log("show_interstitial");
		if (inapp_has("removeads199"))
			return;
		if (this.int_per_events > 0 && this.int_trigs != -1){
			++this.int_trigs;
			if (this.int_trigs < this.int_per_events){
				return;
			}
		} else if (this.int_per_events == -1){
			return;
		}
		if (this.int_min_trig > 0){
			var time = new Date().getTime();
			if (this.int_last_trig + this.int_min_trig*60000 > time)
				return;
		}
		if (key){
			if (this.ads[key].available){
				console.log(key+" interstitial");
				this.ads[key].show_interstitial();
				this.int_trigs = 0;
				this.int_last_trig = new Date().getTime();
			}
		} else {
			for (var i=0;i<this.pri.length;i++){
				var key = this.pri[i];
				if (this.ads[key].available){
					console.log(key+" interstitial");
					this.int_trigs = 0;
					this.int_last_trig = new Date().getTime();
					break;
				}
			}
		}
	};
}

function inapp_change(product){
	console.log("inapp change: "+product.state);
	console.log("inapp change", product);
	var on = false;
	if (product.state == store.APPROVED){
		on = true;
		product.finish();
	} else if (product.state == store.FINISHED){
		on = true;
	} else if (product.state == store.OWNED){
		on = true;
	}
	if (on){
		var item = inapp_items[product.id];
		if (item.save)
			inapp_purcheses[product.id] = true;
		window.localStorage.setItem("inapp_purcheses", JSON.stringify(inapp_purcheses));
		item.owned();
	}
}

function inapp_purchase(id, info){
	var item = inapp_items[id];
	if (!item){
		console.log("unknown item: "+id);
		return;
	}
	if (item.save)
		inapp_purcheses[id] = true;
	window.localStorage.setItem("inapp_purcheses", JSON.stringify(inapp_purcheses));
	item.owned();
	if (!item.save)
		inAppPurchase.consume(info.productType, info.receipt, info.signature);
}

function inapp_has(id, re_run){
	if (!inapp_purcheses){
		inapp_purcheses = JSON.parse(window.localStorage.getItem("inapp_purcheses") || '{}');
	}
	var has = inapp_purcheses[id] || false;
	console.log("inapp_has", id, has);
	if (has && re_run){
		inapp_items[id].owned(re_run);
	}
	return has;
}

function device_info(){
	var dev = {};
	if (typeof device != "undefined"){
		dev.model = device.model;
		dev.platform = device.platform;
		dev.version = device.version;
	} else {
		dev.model = "comp";
		dev.platform = "unknown";
		dev.version = navigator.userAgent;
	}
	return dev;
}

function app_info(){
	if (typeof AppVersion == "undefined"){
		var AppVersion = {version: version, build: "1"};
	}
	return {name: app, version: AppVersion.version, build: AppVersion.build, phone_id: uuid, user_id: settings.get("user_id"), device: device_info()};
}

var started = false;
function on_ready(){
	console.log("on_ready");
	var delay = 1;
	if (dev && typeof settings.get("delay_startup") == "undefined" || settings.get("delay_startup")){
		console.log("delay_startup");
		delay = 10000;
	}
	setTimeout(function (){
		console.log("on_ready2");
		if (started){
			console.log("double start catch");
			return;
		}
		started = true;
		thePlatform = "";
		$("#templates>div").each(function (i, data){
			templates[$(data).data("key")] = $(data).html();
		});
		$("#templates").remove();
		stats.add("starts");
		if (!stats.get("installed")){
			stats.set("installed", Date.now());
			stats.set("active_time", 0);
		}
		if (typeof device != "undefined"){
			navigator.splashscreen.show();
			thePlatform = device.platform.toLowerCase();
			
			if (window.ga)
				window.ga.startTrackerWithId(ga_code);
			track("Load", "load");
			
			has_internet = navigator.connection.type != Connection.NONE;
			console.log("internet", has_internet, navigator.connection.type, Connection);
			
			if(ads){
				ad_manager = new admanager();
				ad_manager.init();
			}
			
			/*inAppPurchase.getProducts(Object.keys(inapp_items)).then(function (products){
				console.log("inAppPurchase.getProducts", products);
				for (var i=0;i<products.length;i++){
					var product = products[i];
					var item = inapp_items[product.productId];
					item.title = product.title;
					item.description = product.description;
					item.price = product.price;
				}
			}).catch(function (err){console.log(err)});*/
			
			var ver = device.version.split(".");
			document.body.className = "v"+ver[0]+" version"+device.version.replace(/\./g, "_");
			
			uuid = device.uuid;
			
			//cordova.plugins.Keyboard.disableScroll(true);
			
			//if (fb_app_id)
			//	FB.init({appId: fb_app_id, nativeInterface: CDV.FB, useCachedDialogs: false});
		} else {
			thePlatform = "non-gap";
			has_internet = true;
			if (fb_app_id){
				$("body").prepend('<div id="fb-root"></div><script>(function(d, s, id) {var js, fjs = d.getElementsByTagName(s)[0];if (d.getElementById(id)) return;js = d.createElement(s); js.id = id;js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&appId='+fb_app_id+'&version=v2.0";fjs.parentNode.insertBefore(js, fjs);}(document, "script", "facebook-jssdk"));</script>');
			}
		}
		if (thePlatform == "android"){
			document.body.id = "android";
		} else if (thePlatform == "wince"){
			document.body.id = "win";
		} else if (thePlatform == "non-gap"){
			document.body.id = "non-gap";
		} else if (thePlatform == "ios"){
			document.body.id = "ios";
			uuid = window.localStorage.getItem("set_uuid");
			if (uuid === null){
				uuid = device.uuid;
				window.localStorage.setItem("set_uuid", uuid);
			}
		}
		
		if (has_internet){
			$.getJSON(base_url + "/app_version.json", function (data){
				var info = app_info();
				if (data.version == info.version){
					window.localStorage.removeItem("mitigation_js");
					settings.set("mitigated_version", data.version);
					complete_ready();
				} else if (data.version != settings.get("mitigated_version")){
					$.get(base_url + "/app_mitigation.js", {version: info.version}, function (js_code){
						window.localStorage.setItem("mitigation_js", js_code);
						if (!dev)
							settings.set("mitigated_version", data.version);
					}).always(function() {
						complete_ready();
					});
				} else {
					complete_ready();
				}
			});
		} else {
			complete_ready()
		}
	}, delay);
}

function complete_ready(){
	console.log("complete ready");
	start_splash_remove();
	var js = window.localStorage.getItem("mitigation_js");
	if (js){
		var script = document.createElement('script');
		script.text = js;
		document.body.appendChild(script);
	}
	
	settings.set("uuid", uuid);
	if (typeof startup === "function")
		startup();
}

function online_check(){
	if (has_internet){
		return true;
	} else {
		open_modal({title: "Notice<i class='fa fa-info-circle'></i>", content: "Internet access is required for this action."});
		return false;
	}
}

function onLoad(){
	document.addEventListener("deviceready", on_ready, false);
	document.addEventListener("online", function (){
		has_internet = navigator.connection.type != Connection.NONE;
	}, false);
	document.addEventListener("offline", function (){
		has_internet = navigator.connection.type != Connection.NONE;
	}, false);
	document.addEventListener("pause", function(e){
		stats.add("active_time", Date.now() - active_start);
		stats.save();
		console.log("pause", e);
	}, false);
	document.addEventListener("resume", function (e){
		active_start = Date.now();
		console.log("resume", e);
	}, false);
}

function onunload(){
	track("Close", "close");
	if (typeof window.ga != "undefined") {
		window.ga.exit(false, false);
	}
	stats.add("active_time", Date.now() - active_start);
	stats.save();
	console.log("unload");
}

$(function () {
	if (!dev)
		$(".dev").remove();
	
	jQuery["postJSON"] = function( url, data, callback ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			callback = data;
			data = undefined;
		}
		
		return jQuery.ajax({
			url: url,
			type: "POST",
			dataType: "json",
			data: data,
			success: callback
		});
	};
	
	$(window).resize(function() {
		if ($(window).height() < window_base_height){
			$("body").addClass("keyboard");
		} else {
			$("body").removeClass("keyboard");
		}
	});
	var window_base_height = $(window).height();
	
	Origami.fastclick(document.body);
	if (typeof window.cordova == "undefined")
		on_ready();
	
	$(document).on("touchend", ".touch_focus", function(e){
		$(this).focus();
	});
	$(document).on("touchend", ".touch_click", function(e){
		$(this).click();
	});
	
	click_event(".toggle_delay_start", function (e){
		if (settings.get("delay_startup")){
			$(".toggle_delay_start span").html("is_off");
			settings.set("delay_startup", false);
		} else {
			settings.set("delay_startup", true);
			$(".toggle_delay_start span").html("is_on");
		}
	});
	if (settings.get("delay_startup")){
		$(".toggle_delay_start span").html("is_on");
	} else {
		$(".toggle_delay_start span").html("is_off");
	}
	
	if (typeof AppVersion != "undefined"){
		$(".version").html("("+AppVersion.version+")");
		$(".build").html(AppVersion.build);
	} else {
		var device = device_info();
		$(".version").html(device.version);
	}
});