function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
var iter = 0;
var stime = 0;

function get_playable(board, last_move){
	console.log(board, last_move);
	if (last_move && last_move.move && board.places[last_move.move] == 0){
		return [last_move.move];
	} else {
		var ret = [];
		for (var i=1;i<10;i++){
			if (board.places[i] == 0){
				ret.push(i);
			}
		}
		return ret;
	}
}

function Game(data){
	this.boards = Board.get_empty();
	console.log(data);
	if (!data){
		this.last_move = false;
	} else if (data.state){
		for (var i=0;i<10;i++){
			this.boards[i].places = [0];
			for (var j=1;j<10;j++){
				this.boards[i].places[j] = parseInt(data.state[i][j]);
			}
			this.boards[i].state = parseInt(data.state[i].state);
		}
		this.last_move = data.last_move;
	} else {
		for (var i=0;i<10;i++){
			this.boards[i].places = data.boards[i].places;
			this.boards[i].state = data.boards[i].state;
		}
		this.last_move = data.last_move;
	}
}

Game.prototype.get_playable = function (){
	return get_playable(this.boards[0], this.last_move);
};

Game.prototype.move = function (move){
	this.boards[move.board].places[move.move] = move.type;
	this.last_move = move;
	//console.log(move);
	this.boards[move.board].check(this.boards, move);
	//console.log(move);
};

function Board(pos){
	this.state = 0;
	this.pos = pos;
	this.places = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

Board.prototype.duplicate = function (){
	var board = new Board(this.pos);
	board.state = this.state;
	board.places = this.places.slice(0);
	return board;
};

Board.prototype.check = function (boards, save){
	save = save || false;
	var ret = false;
	for (var i=0;i<Board.plays.length;i++){
		var plays = Board.plays[i];
		
		var do_cont = false;
		var state = false;
		for (var j=0;j<3;j++){
			var pos = plays[j];
			if (this.places[pos] == 0){
				do_cont = true;
				break;
			}
			if (state === false){
				state = this.places[pos];
			} else if (state != this.places[pos]){
				do_cont = true;
			}
		}
		if (do_cont)
			continue;
		this.state = state;
		ret = true;
		break;
	}
	if (!ret){
		if (this.is_full()){
			this.state = 3;
			ret = true;
		}
	}
	//console.log("board?", save, ret, this.pos);
	if (save){
		if (ret){
			if (this.pos != 0){
				//console.log("full_board", save);
				boards[0].places[this.pos] = this.state;
				save.grid_update = {grid: this.pos, state: this.state};
				if (boards[0].check(boards, true))
					save.game_complete = true;
			}
		}
		return ret;
	}
	if (ret){
		if (this.pos == 0){
			return 10000;
		} else {
			boards[0].places[this.pos] = state;
			var r2 = boards[0].check(boards);
			if (r2)
				return r2;
			return 100;
		}
	}
	return ret;
};

Board.prototype.is_full = function (){
	for (var i=1;i<10;i++){
		if (this.places[i] == 0){
			return false;
		}
	}
	this.state = 3;
	return true;
};

Board.states = ["Open", "Player 1", "Player 2", "Tie"];
Board.plays = [
	[1, 2, 3],
	[4, 5, 6],
	[7, 8, 9],
	[1, 4, 7],
	[2, 5, 8],
	[3, 6, 9],
	[1, 5, 9],
	[3, 5, 7]];

function Move(){
	this.id = 0;
	this.type = 0;
	this.rank = 0;
	this.board = 0;
	this.move = 0;
}

function Move_comp(a, b){
	if (a.rank == b.rank)
		return 0;
	return a.rank > b.rank ? -1 : 1;
}

function Ai(level){
	this.play_first = false;
	this.level = level;
	this.depth = level;
	if (level == 4){
		var scope = this;
		tf.loadModel("indexeddb://my-model-1").then((model) => scope.model = model);
	}
}

Ai.prototype.process = async function (boards, depth, prev_move){
	depth = depth || 0;
	iter++;
	if (depth == 0){
		iter = 0;
		stime = Date.now();
	} else {
		//await sleep(10);
		if (iter > 1000 || Date.now() - stime > 10000){
			return;
		}
	}
	prev_move = prev_move || new Move();

	if (this.model){
		var playable = get_playable(boards[0], prev_move);
		var move_promis = this.model.predict(this.get_tensor(boards, prev_move, playable));
		var move_data = await move_promis.data();
		var moves = [];
		for (var i=0;i<move_data.length;i++){
			moves.push([i, move_data[i]]);
		}
		moves.sort(function (a, b){
			return b[1]-a[1];
		});
		var move = new Move();
		for (var i=0;i<moves.length;i++){
			var b = Math.floor(moves[i][0] / 9) + 1;
			var m = (moves[i][0] % 9) + 1;
			if (playable.includes(b) && boards[b].places[m] == 0){
				move.board = b;
				move.move = m;
				move.rank = moves[i][1];
				//console.log("processing time", Date.now() - stime);
				break;
			}
		}
		return move;
	}

	if (depth >= this.depth)
		return;

	var me = 2;
	var you = 1;
	if (this.play_first){
		me = 1;
		you = 2;
	}

	var playable = get_playable(boards[0], prev_move);
	var moves = [];
	loop_break:
	for (var i=0;i<playable.length;i++){
		var board = playable[i];
		var tmoves = this.asses_board(boards[board], me, you);

		for (var j=0;j<tmoves.length;j++){
			var move = tmoves[j];
			move.board = board;

			var tboards = this.duplicate_boards(boards);
			tboards[board].places[move.move] = depth%2?me:you;
			var ret = tboards[board].check(tboards);
			if (ret > 1000){
				move.rank = 10000;
				moves.push(move);
				break loop_break;
			} else if (ret > 10){
				move.rank = 100*Ai.pos_rate[move.board];
			}
			var nmove = await this.process(tboards, depth+1, move);
			if (nmove){
				move.rank -= nmove.rank;
			}

			moves.push(move);
		}
	}
	var fmove = this.final_move(moves);
	if (depth == 0){
		//console.log("processing time", Date.now() - stime);
		//TODO, send move to server? and save for later use.
	}
	return fmove;
};

Ai.prototype.asses_board = function (board, me, you){
	var moves = [];

	for (var i=0;i<Board.plays.length;i++){
		var play = Board.plays[i];
		var nums = [0, 0, 0];
		var pplace = 0;
		for (var j=0;j<3;j++){
			++nums[board.places[play[j]]];
			if (board.places[play[j]] == 0)
				pplace = play[j];
		}
		if (nums[0] == 1 && nums[me] == 2){
			var move = new Move();
			move.rank = 9;
			move.move = pplace;
			moves.push(move);
			break;
		}
		if (nums[0] == 1 && nums[you] == 2){
			var move = new Move();
			move.rank = 8;
			move.move = pplace;
			moves.push(move);
		}
	}

	for (var i=1;i<=9;i++){
		if (board.places[i] == 0 && !this.has_moved(moves, i)){
			board.places[i] = me;
			if (this.fork_asses(board, me)){
				var move = new Move();
				move.rank = 7;
				move.move = i;
				moves.push(move);
			}
			board.places[i] = you;
			if (this.fork_asses(board, you)){
				var move = new Move();
				move.rank = 6;
				move.move = i;
				moves.push(move);
			}
			board.places[i] = 0;
		}
	}

	if (board.places[5] == 0 && !this.has_moved(moves, 5)){
		var move = new Move();
		move.rank = 5;
		move.move = 5;
		moves.push(move);
	}

	for (var i=0;i<Ai.corners.length;i++){//TODO, this should be can i setup a win
		if (board.places[Ai.corners[i]] == you && board.places[Ai.op_corners[i]] == 0 && !this.has_moved(moves, Ai.op_corners[i])){
			var move = new Move();
			move.rank = 4;
			move.move = Ai.op_corners[i];
			moves.push(move);
		}
	}

	for (var i=0;i<Ai.corners.length;i++){
		var play = Ai.corners[i];
		if (board.places[play] == 0 && !this.has_moved(moves, play)){
			var move = new Move();
			move.rank = 3;
			move.move = play;
			moves.push(move);
		}
	}

	for (var i=0;i<Ai.sides.length;i++){
		var play = Ai.sides[i];
		if (board.places[play] == 0 && !this.has_moved(moves, play)){
			var move = new Move();
			move.rank = 2;
			move.move = play;
			moves.push(move);
		}
	}

	return moves;
};

Ai.prototype.fork_asses = function (board, who){
	var num = 0;
	for (var i=0;i<Board.plays.length;i++){
		var play = Board.plays[i];
		var nums = [0, 0, 0];
		//var pplace = 0;
		for (var j=0;j<3;j++){
			++nums[board.places[play[j]]];
			//if (board.places[play[j]] == 0)
			//	pplace = play[j];
		}
		if (nums[0] == 1 && nums[who] == 2){
			//console.log("found", who, nums, play, board.places);
			num++;
		}
	}
	return num > 1;
};

Ai.prototype.has_moved = function (moves, move){
	for (var i=0;i<moves.length;i++){
		if (moves[i].move == move)
			return true;
	}
};

Ai.prototype.duplicate_boards = function (boards){
	var b = [];
	for (var i=0;i<10;i++){
		b.push(boards[i].duplicate());
	}
	return b;
};

Ai.prototype.final_move = function (moves){
	var rank = false;
	var final_moves = [];
	moves.sort(Move_comp);
	for (var i=0;i<moves.length;i++){
		var move = moves[i];
		if (rank === false){
			rank = move.rank;
		} else if (rank != move.rank){
			break;
		}
		final_moves.push(move);
	}
	return final_moves[Math.floor(Math.random()*final_moves.length)];
};

Ai.prototype.get_tensor = function (boards, last_move, playable){
	var playable = playable || get_playable(boards[0], last_move);
	var hash = [];

	for (var i=1;i<10;i++){
		var state = boards[i].state;
		var places = boards[i].places.slice(1);

		if (!this.play_first){
			if (state == 2 || state == 1){
				if (state == 1)
					state = 2;
				else
					state = 1;
			}
			places.map(c => c=='1'?'2':'1');
		}

		hash.push(playable.includes(i)?1:0, state/3);
		hash.push(...places.map(x => x / 2));
	}
	//console.log(hash);
	return tf.tensor([hash]);
};

Ai.pos_rate = [0, 3, 2, 3, 2, 4, 2, 3, 2, 3];
Ai.corners = [1, 3, 7, 9];
Ai.op_corners = [7, 9, 1, 3];//TODO, this is bad, need to be updated to "any corner", not just one.
Ai.sides = [2, 4, 6, 8];


Board.get_empty = function (){
	var boards = [];
	for (var i=0;i<10;i++){
		boards.push(new Board(i));
	}
	return boards;
};
var boards = Board.get_empty();
