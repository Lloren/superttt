"use strict";

var showing_page = false;
function show_page(key, onload){
	if (showing_page){
		return;
	}
	showing_page = true;
	if (typeof onload == "undefined")
		onload = true;
	var page = $("#"+key);
	if (onload && page.data("on_open")){
		window[page.data("on_open")]();
		console.log(page.data("on_open"));
	}
	$(".lmenu, .rmenu").removeClass("active");
	$("[data-onpage='"+key+"']").addClass("active");
	var over = page.hasClass("show_bottom");
	var prev = $(".page:visible");
	if (prev.length >= 2 && (over || $(".page:not(.show_bottom):visible").attr("id") == key)){
		prev = prev.eq(1);
	} else {
		prev = prev.first();
	}
	//$(".page.hiding").removeClass("hiding show");
	if (over){
		$("[data-onpage='overlay']").addClass("active");
	}
	var pover = prev.hasClass("show_bottom");
	if (prev.attr("id") != page.attr("id")){
		prev.addClass("hiding");
		page.addClass("show");
		setTimeout(function (){
			page.addClass("shown");
		}, 1);
		setTimeout(function (){
			showing_page = false;
			if (over && !pover){
				//prev.removeClass("hiding show shown");
			} else {
				prev.removeClass("hiding show shown");
			}
		}, 500);
		if (prev.data("unload")){
			window[prev.data("unload")]();
		}
	} else {
		showing_page = false;
	}
}

function open_menu(){
	$("#nav").addClass("open");
	$("#nav-overlay").addClass("enabled");
}

function close_menu(){
	$("#nav").removeClass("open");
	$("#nav-overlay").removeClass("enabled");
}

var leaving_message = false;
var last_move_id = 0;
var last_move_num = 0;
var game_check_timeout = false;
var ping_timeout = false;

var push_enabled = false;
var last_push_game = false;

var start_message = false;

var Audio = false;

var player_char = "x";
var other_player_char = "o";
var player_num = 1;
var other_num = 2;
var game = false;
var game_type = "";
var game_online = false;
var game_ai = false;
var user_turn = true;
var state_lookup = {1: "x", 2: "o", 3: "h"};
var char_lookup = {"x": "fa-times", "o": "fa-circle-o", "h": "fa-square-o"};
var ai_types = ["none", "Easy", "Medium", "Hard", "Expert"];
function start_game(type, t2, load){
	load = load || false;
	console.log("start_game", type, t2, load);
	game_type = type;
	game_ai = false;
	game_online = false;
	player_char = "x";
	other_player_char = "o";
	player_num = 1;
	other_num = 2;
	game = new Game();
	start_message = true;
	var game_key = "";
	if (type == "ai"){
		game_ai = new Ai(t2);
		if (!load)
			stats.add("ai_games");
		game_key = "AI_"+t2;
	} else if (type == "local"){
		game_key = "Local";
	} else if (type == "online"){
		game_online = t2;
		game_key = "";
	}
	if (load && game_key){
		var dat = window.localStorage.getItem(game_key);
		if (dat){
			start_message = false;
			var data = JSON.parse(dat);
			player_char = data.player_char;
			other_player_char = data.other_player_char;
			player_num = data.player_num;
			other_num = data.ai_num;
			user_turn = data.user_turn;
			game = new Game(data.game);
		}
	}

	show_page("game");
}

function save_game(clear){
	clear = clear || false;
	var game_key = "";
	var t2 = false;
	if (game_type == "ai"){
		t2 = game_ai.level;
		game_key = "AI_"+game_ai.level;
	} else if (game_type == "local"){
		game_key = "Local";
	} else if (game_type == "online"){
		game_key = "";
	}
	if (game_key){
		if (clear){
			window.localStorage.removeItem(game_key);
			return;
		}
		var data = {};
		data.type = game_type;
		data.t2 = t2;
		data.game = game;
		data.player_char = player_char;
		data.other_player_char = other_player_char;
		data.player_num = player_num;
		data.ai_num = other_num;
		data.user_turn = user_turn;
		window.localStorage.setItem(game_key, JSON.stringify(data));
	}
}

function swap_players(){
	var t = player_char;
	player_char = other_player_char;
	other_player_char = t;
	t = player_num;
	player_num = other_num;
	other_num = t;
	$("#game_p1_marker").removeClass(char_lookup[other_player_char]).addClass(char_lookup[player_char]);
	$("#game_p2_marker").removeClass(char_lookup[player_char]).addClass(char_lookup[other_player_char]);
	$("#game_player_turn").html(template("play_"+(player_num == 2?player_char:other_player_char)));
}

function open_homepage(){
	if (window.localStorage.getItem("AI_1")){
		$("#AI_1").addClass("has_saved");
	} else {
		$("#AI_1").removeClass("has_saved");
	}
	if (window.localStorage.getItem("AI_2")){
		$("#AI_2").addClass("has_saved");
	} else {
		$("#AI_2").removeClass("has_saved");
	}
	if (window.localStorage.getItem("AI_3")){
		$("#AI_3").addClass("has_saved");
	} else {
		$("#AI_3").removeClass("has_saved");
	}
	if (window.localStorage.getItem("Local")){
		$("#Local").addClass("has_saved");
	} else {
		$("#Local").removeClass("has_saved");
	}
}

function open_game(){
	var type = "";
	var other = "";
	var leave_page = "homepage";
	console.log(game_type);
	if (game_type == "ai"){
		type = ai_types[game_ai.level]+" A.I.";
		other = type;
	} else if (game_type == "local"){
		type = "Local";
		other = "Them";
	} else if (game_type == "online"){
		var leave_page = "online";
		type = "Online";
		other = "Them"
	}
	$("#rleavebutton").data("page", leave_page);
	
	$("#game .show").removeClass("show");
	$("#game .board .fa").remove();
	$("#game .highlight").removeClass("highlight");
	$("#game_p1_name").html("you");
	$("#game_p2_name").html(type);
	$("#game_p1_marker").removeClass(char_lookup["o"]).addClass(char_lookup["x"]);
	$("#game_p2_marker").removeClass(char_lookup["x"]).addClass(char_lookup["o"]);
	$("#game_player_turn").html(template("play_x"));
	$("#game #game_p2_name").removeClass(other);

	if (type == "Online"){
		make_call("/ajax/game_call.php", {action: "state", game_id: game_online}, function (data){
			start_message = false;
			/*player_char = data.player_char;
			other_player_char = data.other_player_char;
			player_num = data.player_num;
			other_num = data.ai_num;*/
			if (data.player_num != 0){
				$("#game_p1_name").html("you");
			} else {
				$("#game_p1_name").html(data.username);
			}
			$("#game_p2_name").html(data.other_name);
			if (data.player_num == 2){
				swap_players();
			}
			user_turn = data.your_turn == "1";
			console.log("your turn", user_turn);
			if (!push_enabled && !user_turn){
				game_check_timeout = setTimeout(function () { check_status(); }, 5000);
			}
			game = new Game(data);
			build_game(type);
		});
	} else {
		build_game(type);
	}
}

function close_game(){
	clearTimeout(game_check_timeout);
	game_check_timeout = false;
}

function build_game(type){
	if (start_message){
		open_modal({content: '<div class="gameselectbuttons"><a class="button">Play as X</a><a class="button">Play as O</a></div>', title: type+" Game", button1: false, callback: function (button){
			if (button == "Play as O"){
				swap_players();
			}
		}});
	}

	for (var i=1;i<10;i++){
		if (game.boards[i].state){
			$(".main_grid.grid_"+i+" .overlay").html(template("play_"+state_lookup[game.boards[i].state]));
		}
		for (var j=1;j<10;j++){
			if (game.boards[i].places[j]){
				$(".main_grid.grid_"+i+" .grid_"+j).html(template("play_"+state_lookup[game.boards[i].places[j]]));
			}
		}
	}
	
	if (game.last_move){
	
	} else {
		process_turn(game.last_move);
	}

	var playable = game.get_playable();
	console.log(playable);
	$(".main_grid .overlay").addClass("show");
	for (var grid in playable){
		$(".main_grid.grid_"+playable[grid]+" .overlay").removeClass("show");
	}
}

function process_move(move, who){
	move.type = who;

	game.move(move);
	
	process_turn(move);
	
	console.log("move", move);
	
	return move.game_complete;
}

function process_turn(data){
	console.log(data);
	var disp_char = player_num == data.type?player_char:other_player_char;
	$(".prev_last_play").removeClass("prev_last_play");
	$(".last_play").removeClass("last_play").addClass("prev_last_play");
	$(".grid_"+data.board+" .grid_"+data.move).html(template("play_"+disp_char)).addClass("last_play");
	$("#game_player_turn").html(template("play_"+(player_num != data.type?player_char:other_player_char)));
	if (data.grid_update){
		$(".main_grid.grid_"+data.grid_update.grid+" .overlay").addClass("show").html(template("play_"+state_lookup[data.grid_update.state]));
		if (data.type == player_num){
			Audio.play_sound("game_win_square", "controls");
		} else {
			Audio.play_sound("game_lose_square", "controls");
		}
	}
	if (data.game_complete){
		$(".expand").removeClass("expand");
		$(".board.content > .overlay").addClass("show").html("<div>Game Complete.<br />"+(data.type==3?"Cats Game!":disp_char.toUpperCase()+" Wins!</div>"));

		save_game(true);

		var title = "";
		if (data.type == 3){
			title = 'Cats Game!';
		} else if (data.type == player_num){
			Audio.play_sound("game_win", "controls");
			title = '<i class="fa '+char_lookup[player_char]+'" style="color:#1c86ff;"></i> You Win!';
		} else {
			title = '<i class="fa '+char_lookup[player_char]+'" style="color:#ff3d1c;"></i> You Lost :-(';
		}
		open_modal({content: '<div class="gameselectbuttons"><div>Options</div><a class="button">Play Again</a><a class="button">Review Board</a><a class="button">End Game</a></div>', title: title, button1: false, callback: function (button){
			if (button == "Play Again"){//TODO, online needs more checks
				if (game_type == "Online"){

				} else {
					start_game(game_type, game_ai?game_ai.level:false);
				}
			} else if (button == "End Game"){
				open_homepage();
			}
		}});
	} else {
		var playable = game.get_playable();
		$(".main_grid .overlay").addClass("show");
		for (var grid in playable){
			$(".main_grid.grid_"+playable[grid]+" .overlay").removeClass("show");
		}
	}
}

function set_user_turn(active){
	user_turn = active;
	if(active){
		$(".board.content > .overlay").removeClass("show");
		//ping_timeout = setTimeout(function () { ping(); }, 5000);
		$("#last_ping_time").val("");
	} else {
		$(".board.content > .overlay").addClass("show").html("<div>Waiting for turn...</div>");
		if (game_online)
			game_check_timeout = setTimeout(function () { check_status(); }, 5000);
	}
	save_game();
}

function check_status(call){
	call = call || 1;
	var query = {"action": "check", "game_id": game_online, "last_move_id": last_move_id};
	//if (player_num == 0)
	//	query["move_num"] = last_move_num; //Used to get multiple moves if you are an observer
	make_call("/ajax/game_call.php?callback=?", query, function (data){
		if (data.waiting){
			game_check_timeout = setTimeout(function () { check_status(call+1); }, (call>10?call-5:5)*1000);
		} else {
			last_move_id = data.move_id;
			last_move_num = data.move_num;
			//calc_ping_time(data.last_ping_time);
			if (data.moves){//todo: likely not working
				for (var i in data.moves){
					process_move({board: data.board, move: data.move}, data.type);
				}
			} else {
				process_move({board: data.board, move: data.move}, data.type);
			}
			set_user_turn(true);
		}
	});
}

function game_format(game){
	var is_1 = settings.get("user_id") == game.user_id_1;
	var is_2 = settings.get("user_id") == game.user_id_2;
	var player = is_1?1:(is_2?2:0);
	if (player != 0)
		game.username = "You";
	if (game.status == 0){
		game.status_out = "In Progress";
	} else if (player != 0){
		if (game.state == player){
			game.status_out = 'You <b>Won!</b>';
		} else {
			game.status_out = 'You <b>Lost!</b>';
		}
	} else {
		if (game.state == 1){
			game.status_out = '<b>'+game.username+' Won!</b>';
		} else {
			game.status_out = '<b>'+game.other_name+' Won!</b>';
		}
	}
	if (game.status == 1){
		game.action_button = 'Completed <i class="fa fa-chevron-right"></i>';
	} else if (player != 0){
		if (game.player_turn == player){
			game.action_button = 'Play <i class="fa fa-chevron-right"></i>';
			game.turn_out = '<b class="yourturn">Your</b>';
		} else {
			game.action_button = 'View <i class="fa fa-chevron-right"></i>';
			game.turn_out = '<b>Their</b>';
		}
	} else {
		game.action_button = 'Watch <i class="fa fa-chevron-right"></i>';
	}
	return template("list_game", game);
}

var online_check_handle = false;
function load_online(calc){
	calc = calc || 1;
	//online_check_handle = setTimeout(function (){load_online(calc+1);}, calc*10000);
	make_call("/ajax/app_online.php", {}, function (data){
		add_notification(true);
		if (data.queue_id){
			$("#find_opponent").hide();
			$("#leave_queue").show();
			settings.set("queue_id", data.queue_id);
		} else {
			$("#find_opponent").show();
			$("#leave_queue").hide();
			settings.delete("queue_id");
		}

		var your_games_html = "No recent games";
		if (data.your_games){
			var your_games = [];
			for (var i=0;i<data.your_games.length;i++){
				your_games.push(game_format(data.your_games[i]));
			}
			your_games_html = your_games.join("");
		}
		$("#your_games").html(your_games_html);
		var global_games_html = "No recent games";
		if (data.global_games){
			var global_games = [];
			for (var i=0;i<data.global_games.length;i++){
				global_games.push(game_format(data.global_games[i]));
			}
			global_games_html = global_games.join("");
		}
		$("#global_games").html(global_games_html);
	});
}

function unload_online(){
	clearTimeout(online_check_handle);
}

function check_user(){
	console.log("check_user");
	make_call("/ajax/settings.php", {action:"check"}, function (data){
		console.log("check_user", data);
		if (data.user_id){
			settings.set("user_id", data.user_id);
			settings.set("username", data.name);
			stats.set("online_games", data.loss*1+data.draw*1+data.win*1);
			$("._username").html(data.name);
			$("._win").html(data.win);
			$("._loss").html(data.loss);
			$("._draw").html(data.draw);
		}
	});
}

function make_call(url, add_data, callback, sets){
	sets = sets || {};
	$.ajax(base_url+url, {
		type: sets.type || "GET",
		dataType: sets.dataType || "json",
		data: $.extend({uuid: settings.get("uuid"), user_id: settings.get("user_id")}, add_data),
		success:function (data){
			manage_response(data, callback, sets.on_error || false);
		}
	}).fail(function (data, textStatus, errorThrown){
		console.log("fail", data, textStatus, errorThrown);
	});
}

function manage_response(data, callback, on_error){
	if (data.mess.Error){
		var mess = "";
		for (var i=0;i<data.mess.Error.length;i++)
			mess += "<div>"+data.mess.Error[i].message+"</div>";

		open_modal({title: "Error"+(data.mess.Error.length > 1?"s":""), content:mess});
		if (on_error)
			callback(data);
	} else if (callback){
		callback(data);
	}
}

function update_stats(){
	$("#stat_days").html(Math.ceil((Date.now() - stats.get("installed"))/86400000));
	$("#stat_active").html((stats.get("active_time")/3600000).toFixed(1)+" Hours");
	$("#stat_starts").html(stats.get("starts"));
	$("#stat_ai").html(stats.get("ai_games"));
	$("#stat_ai_complete").html(stats.get("ai_games_complete"));
	$("#stat_online").html(stats.get("online_games"));
}

function add_notification(hide){
	if (hide){
		$("#notification_notice").html(0).hide();
	} else {
		$("#notification_notice").html($("#notification_notice").html()*1 + 1).show();
	}
}

async function timeout(ms) {
	return await new Promise(resolve => setTimeout(resolve, ms));
}

function startup(){
	console.log("start startup");
	if (has_internet){
		if (settings.get("done_first_call")){
			check_user();
		} else {
			console.log("first internet call action");
			settings.set("done_first_call", true);
			check_user();
			timeout(250);
			check_user();
		}
	}
	
	Audio.load_sound("audio/music/bensound-acousticbreeze.mp3", "music1");
	Audio.load_sound("audio/music/bensound-cute.mp3", "music2");
	Audio.load_sound("audio/music/bensound-sunny.mp3", "music3");
	Audio.load_sound("audio/music/bensound-tenderness.mp3", "music4");
	Audio.load_sound("audio/music/bensound-ukulele.mp3", "music5");
	
	
	Audio.load_sound("audio/sfx/button_back.mp3", "button_back");
	Audio.load_sound("audio/sfx/button_click.mp3", "button_click");
	Audio.load_sound("audio/sfx/game_click.mp3", "game_click");
	Audio.load_sound("audio/sfx/game_lose_square.mp3", "game_lose_square");
	Audio.load_sound("audio/sfx/game_win.mp3", "game_win");
	Audio.load_sound("audio/sfx/game_win_square.mp3", "game_win_square");
	
	
	var push = PushNotification.init({
		"android": {
		},
		"ios": {
			"sound": true,
			"vibration": true,
			"badge": true,
			"clearBadge": true
		}
	});
	
	PushNotification.hasPermission(data => {
		console.log("hasPermission", data);
		if (data.isEnabled) {
			push_enabled = true;
		} else {
			push_enabled = false;
		}
	});
	
	push.on("registration", (data) => {
		console.log("registration", data);
		if (has_internet){
			data.platform = device_info().platform;
			var push_info = JSON.stringify(data);
			if (window.localStorage.getItem("push_info") != push_info){
				make_call("/ajax/push.php?action=subscribe", {push_info: push_info}, false, {type: "post"});
				window.localStorage.setItem("push_info", push_info);
			}
		}
	});
	
	push.on("notification", (data) => {
		console.log("notification", data);
		if (data.additionalData.type == "move"){
			last_push_game = data.additionalData.game_id;
			if ($("#game").is(":visible")){
				if (game_online == data.additionalData.game_id){
					process_move({board: data.additionalData.board, move: data.additionalData.move}, other_num);
				} else {
					add_notification();
				}
			} else if ($("#online").is(":visible")){
				load_online();
			}
		}
		// data.message,
		// data.title,
		// data.count,
		// data.sound,
		// data.image,
		// data.additionalData
	});
	
	push.on("error", (e) => {
		console.log("error", e);
		// e.message
	});
	
	
	
	document.addEventListener("resume", function (e){
		if (last_push_game){
			start_game("online", last_push_game);
			last_push_game = false;
		}
	}, false);
	
	
	
	
	
	
	$(document).on("mouseup touchend", function (e){//"not touched" event
		if (!main_grid_touched && $(".board.highlight").length && !e.target.matches(".board.highlight")){
			$(".board.highlight").removeClass("highlight");
			Audio.play_sound("button_back", "controls");
		}
	});
	
	click_event("#menubutton", function (e){
		Audio.play_sound("button_click", "controls");
		open_menu();
	});

	click_event("#nav-overlay", function (e){
		Audio.play_sound("button_back", "controls");
		close_menu();
	}, false, true);

	click_event(".play_game", function (e){
		var saved_game = e.originalEvent.target.localName == "div";
		if ($(this).hasClass("ai")){
			start_game("ai", $(this).data('diff'), saved_game);
		} else if ($(this).hasClass("local")){
			start_game("local", false, saved_game);
		} else if ($(this).hasClass("online")){
			start_game("online", 1/*id*/);
		}
	}, false, true);

	/*click_event("#game", function (e){
		console.log("game", $(".board.highlight").length);
		if ($.contains($(this), $(".board.highlight"))){
			//$(".board.highlight").removeClass("highlight");
		}
	});*/

	var main_grid_touched = false;
	click_event(".main_grid", function (e){
		console.log("main_grid");
		var board = $(this).children(".board");
		if (!board.hasClass("highlight") && !board.children(".overlay").hasClass("show")){
			main_grid_touched = true;
			setTimeout(function (){main_grid_touched = false;}, 200);
			board.addClass("highlight");
			Audio.play_sound("game_click", "controls");
		}
	});

	click_event(".highlight .sub_grid", function (e){
		var tmp_grid = $(this);
		//console.log(user_turn, player_num != 0, (tmp_grid.parents(".board").hasClass("highlight") && !main_grid_touched), tmp_grid.parents(".board").hasClass("highlight"), !main_grid_touched);
		if (user_turn && player_num != 0 && (tmp_grid.parents(".board").hasClass("highlight") && !main_grid_touched)){
			$("#pre_choices").hide();
			if (!tmp_grid.find(".fa").length){
				setTimeout(function (){
					tmp_grid.parents(".board").removeClass("highlight");
				}, 100);
				Audio.play_sound("game_click", "controls");
				var complete = process_move({board: tmp_grid.parents(".main_grid").data("grid"), move: tmp_grid.data("grid")}, player_num);
				if (game_ai && !complete){
					set_user_turn(false);
					setTimeout(function (){
						var ai_move = game_ai.process(game.boards, 0, game.last_move);
						ai_move.then(function (res){
							if (!process_move(res, other_num)){
								set_user_turn(true);
							}
						});
					}, 400);
				} else if (game_online){
					make_call("/ajax/game_call.php?callback=?", {"action": "move", "game_id": game_online, "board": tmp_grid.parents(".main_grid").data("grid"), "move": tmp_grid.data("grid")}, function (data){
						if (data.good_move){
							last_move_id = data.move_id;
							$(".board.content > .overlay").addClass("show").html("<div>"+template("play_"+player_char)+"'s Turn</div>");
							set_user_turn(false);
						} else {
							open_modal();
						}
					});
				} else if (game_type == "local" && !complete){
					//TODO: make handoff/"X's turn" message
					swap_players();
					$(".board.content > .overlay").addClass("show").html("<div>"+template("play_"+player_char)+"'s Turn</div>");
					setTimeout(function (){
						set_user_turn(true);

						var playable = game.get_playable();
						//console.log(playable);
						$(".main_grid .overlay").addClass("show");
						for (var grid in playable){
							$(".main_grid.grid_"+playable[grid]+" .overlay").removeClass("show");
						}
					}, 1000);

				}
				/*
				 $.getJSON("/ajax/game_call.php?callback=?", {"action": "move", "game_id": "", "main": $(this).parents(".main_grid").attr("grid"), "sub": $(this).attr("grid")}, function (data){
				 if (data.good_move){
				 if (ping_timeout)
				 clearTimeout(ping_timeout);
				 $(".prev_last_play").removeClass("prev_last_play");
				 $(".last_play").removeClass("last_play").addClass("prev_last_play");
				 $(".grid_"+data.main+" .grid_"+data.sub+" ."+player_char).addClass("show").addClass("last_play");
				 if (data.grid_update){
				 $(".main_grid .overlay").addClass("show");
				 $(".main_grid.grid_"+data.grid_update.grid+" .overlay").find("."+player_char).addClass("show");
				 }
				 if (data.game_complete){
				 $(".board > .overlay").addClass("show");
				 $(".board > .overlay div").html("Game Complete. "+player_char.toUpperCase()+" Wins");
				 } else {
				 set_user_turn(data.your_turn);
				 last_move_id = data.move_id;
				 }
				 }
				 });*/
			}
		}

	}, true);
	
	click_event("#closebutton", function (e){
		if ($(".page.show_bottom:visible")){
			Audio.play_sound("button_back", "controls");
			show_page($(".page:not(.show_bottom):visible").attr("id"));
		}
	});

	click_event(".open_game", function (e){
		start_game("online", $(this).data("game_id"));
	}, true);
	
	click_event("#play_friend", function (e){
		open_modala("Searching...", true);
		make_call("/ajax/queue_call.php", {action: "friend", name: $("#play_friend_name").val()}, function (data){
			close_modala();
			if (data.game_id){
				start_game("online", data.game_id);
			}
		});
	});
	
	click_event("#find_opponent", function (e){
		make_call(base_url+"/ajax/queue_call.php", {action: "enter"}, function (data){
			if (data.game_id){
				start_game("online", data.game_id);
			} else {
				settings.set("queue_id", data.queue_id);
				unload_online();
				load_online();
			}
		});
	});

	click_event("#leave_queue", function (e){
		make_call("/ajax/queue_call.php", {action: "leave", queue_id:settings.get("queue_id")}, function (data){
			if (data.leave){
				settings.delete("queue_id");
				unload_online();
				load_online();
			}
		});
	});

	click_event(".change_name", function (e){
		open_modal({title: "Change Display Name", content: '<small>If you change you username you will lose access to it and someone else can take it.</small><input type="text" id="changed_name" value="'+settings.get("username")+'" />', callback: function (button){
			if (button == "Ok"){
				make_call("/ajax/settings.php", {action: "username", username: $("#changed_name").val()}, function (data){
					settings.set("username", data.name);
					$("._username").html(data.name);
				});
			}
		}, button2: true});
	});

	document.addEventListener("closebutton", function (){
		//back_recent();
		//return;
		/*var backs = $(".back:visible");
		 if (backs.length > 0){
		 backs.first().trigger("click_event");
		 } else if ($(".settings_toggle").hasClass("close_main_info")){
		 $(".settings_toggle").trigger("click_event");
		 } else if ($(".settings_toggle").hasClass("open")){
		 $(".settings_toggle").trigger("click_event");
		 } else if ($("#menu-overlay:visible")){
		 $("#menu-overlay").trigger("click_event");
		 }*/
	}, false);

	click_event(".open_page", function (e){
		$("#nav-overlay").trigger("click_event");
		if ($(e.currentTarget).data("check")){
			if (!window[$(e.currentTarget).data("check")]())
				return;
		}
		if ($(e.currentTarget).data("func")){
			window[$(e.currentTarget).data("func")]();
		} else {
			show_page($(e.currentTarget).data("page"));
		}
	}, true, true);

	open_homepage();
	console.log("complete startup");
}