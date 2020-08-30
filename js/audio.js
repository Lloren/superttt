'use strict';

function audio(){
	var scope = this;
	
	this.buffers = {};
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	
	this.play_audio = !!window.AudioContext;
	this.running_music = false;
	this.running_music_name = false;
	
	if (this.play_audio){
		this.context = new AudioContext();
		this.channels = {};
		this.channels["main"] = this.context.createGain();
		this.channels["main"].connect(this.context.destination);
		this.channels["main"].gain.value = 0.25;
		
		this.channels["controls"] = this.context.createGain();
		this.channels["controls"].playing = [];
		this.channels["controls"].connect(this.channels['main']);
		this.channels["controls"].gain.value = 1;
		
		this.channels["controls_quiet"] = this.context.createGain();
		this.channels["controls_quiet"].playing = [];
		this.channels["controls_quiet"].connect(this.channels['controls']);
		this.channels["controls_quiet"].gain.value = 0.5;
		
		this.channels["effects"] = this.context.createGain();
		this.channels["effects"].playing = [];
		this.channels["effects"].connect(this.channels['main']);
		this.channels["effects"].gain.value = 1;
		
		this.channels["effects_quiet"] = this.context.createGain();
		this.channels["effects_quiet"].playing = [];
		this.channels["effects_quiet"].connect(this.channels['effects']);
		this.channels["effects_quiet"].gain.value = 0.5;
		
		this.channels["music"] = this.context.createGain();
		this.channels["music"].playing = [];
		this.channels["music"].connect(this.channels['main']);
		this.channels["music"].gain.value = 0.5;
		
		this.channels["music1"] = this.context.createGain();
		this.channels["music1"].playing = [];
		this.channels["music1"].connect(this.channels['music']);
		this.channels["music1"].gain.value = 0;
		
		this.channels["music2"] = this.context.createGain();
		this.channels["music2"].playing = [];
		this.channels["music2"].connect(this.channels['music']);
		this.channels["music2"].gain.value = 0;
	}
	
	this.set_volume = function (value, channel){
		channel = channel || "main";
		if (!this.play_audio || !this.channels[channel])
			return;
		this.channels[channel].gain.value = value;
	};
	
	this.load_sound = function (url, name, num, on_load, sec_info){
		if (this.buffers[name] || !this.play_audio)
			return;
		console.log("load audio", name, num, url);
		num = num || 1;
		on_load = on_load || false;
		
		for (var a=0; a<num; a++){
			//++g.objects_to_load;
			this.buffers[name] = [];
			var url_call = url.replace("_#", "_"+a);
			if (typeof file_cache != "undefined"){
				file_cache.get_file(url_call, function(data, url){
					console.log(url_call, url);
					scope.context.decodeAudioData(data, function(buffer) {
						buffer.url_loc = url;
						scope.buffers[name].push(buffer);
						g.object_loaded();
						if (on_load){
							on_load(sec_info);
						}
					});
				}, "arraybuffer");
			} else {
				var request = new XMLHttpRequest();
				request.open("GET", url_call, true);
				request.responseType = "arraybuffer";
				
				request.onload = function() {
					var turl = this.responseURL;
					scope.context.decodeAudioData(this.response, function(buffer) {
						buffer.url_loc = turl;
						scope.buffers[name].push(buffer);
						if (on_load){
							on_load(sec_info);
						}
					});
				};
				request.send();
			}
		}
	};
	
	this.load_sound_raw = function (data, url, name, num, on_load, sec_info){
		if (this.buffers[name] || !this.play_audio)
			return;
		num = num || 1;
		on_load = on_load || false;
		
		for (var a=0; a<num; a++){
			this.buffers[name] = [];
			scope.context.decodeAudioData(data, function(buffer) {
				buffer.url_loc = url;
				scope.buffers[name].push(buffer);
				if (on_load){
					on_load(sec_info);
				}
			});
		}
	};
	
	this.fade = function (gain, vol, time, callback){
		vol = vol || 0.0;
		time = time || 1000;
		$(gain).animate({value: vol}, time, callback);
	};
	
	this.play_sound = function (name, channel, loop, rand) {
		if (!this.play_audio)
			return;
		channel = channel || "main";
		rand = rand || false;
		var source = this.context.createBufferSource();
		if (this.buffers[name].length > 1){
			source.buffer = this.buffers[name][Math.floor(Math.random()*this.buffers[name].length)];
		} else if (this.buffers[name].length){
			source.buffer = this.buffers[name][0];
		} else {
			return false;
		}
		source.loop = loop || false;
		if (channel != "none"){
			source.connect(this.channels[channel]);
			if (this.channels[channel].playing)
				this.channels[channel].playing.push(source);
		}
		/*source.ended = function (){
			console.log("song ended");
			if (!source.loop)
				scope.channels[channel].playing.splice(scope.channels[channel].playing.indexOf(source), 1);
		};*/
		if (!source.start)
			source.start = source.noteOn;
		var start = 0;
		//console.log(source);
		if (rand && source.buffer)
			start = source.buffer.duration*Math.random();
		source.start(0, start);
		return source;
	};
	
	this.update_music = function (audio, rand, retry, callback){
		console.log("Update Music", audio);
		if (!this.play_audio || (this.running_music && audio == this.running_music_name))
			return;
		if (typeof rand == "undefined")
			rand = true;
		if (typeof retry == "undefined")
			retry = true;
		var cur_channel = false;
		var new_channel = false;
		if (!this.channels['music1'].playing.length){
			cur_channel = this.channels['music2'];
			new_channel = this.channels['music1'];
		} else if (!this.channels['music2'].playing.length){
			cur_channel = this.channels['music1'];
			new_channel = this.channels['music2'];
		}
		if (this.running_music){
			this.fade(cur_channel.gain, 0, 2000, function (){
				for (var i=0;i<cur_channel.playing.length;i++){
					cur_channel.playing[i].disconnect(cur_channel);
				}
				cur_channel.playing = [];
			});
		}
		if (new_channel){
			this.running_music_name = audio;
			new_channel.gain.value = 0;
			var audio_handle = this.play_sound(audio, "none", rand, rand);
			if (audio_handle.buffer)
				$("#music_name").html(audio_handle.buffer.url_loc.split("/").pop().split("-")[1].slice(0, -4));
			audio_handle.connect(new_channel);
			this.running_music = audio_handle;
			new_channel.playing.push(audio_handle);
			if (rand){
				this.fade(new_channel.gain, 1, 2000, function (){
				
				});
			} else {
				new_channel.gain.value = 1;
			}
			if (callback)
				callback(audio_handle);
		} else if (retry){
			setTimeout(function (){
				Audio.update_music(audio, rand, retry, callback);
			}, 100);
		}
	};
	
	this.playlist_index = -1;
	this.playlist_songs = [];
	this.playlist_rand = false;
	this.set_playlist = function(songs, rand){
		this.playlist_rand = rand || false;
		this.playlist_index = -1;
		this.playlist_songs = songs;
		this.next_playlist();
	};
	
	this.next_playlist = function(){
		var key = -1;
		if (this.playlist_rand){
			do{
				key = Math.floor(Math.random()*this.playlist_songs.length);
			} while(key == this.playlist_index);
		} else {
			this.playlist_index = this.playlist_index + 1;
			if (this.playlist_index >= this.playlist_songs.length)
				this.playlist_index = 0;
		}
		this.update_music(this.playlist_songs[this.playlist_index], false, true, function (audio_handle){
			audio_handle.addEventListener('ended', () => {
				Audio.next_playlist();
			})
		});
	}
}
var Audio = new audio();