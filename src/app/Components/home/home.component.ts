import { Component, EventEmitter, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GamesService } from '../../Services/games.service';
import { BalanceService } from 'app/Services/balance.service';
import { SocketService } from '../../Services/socket.service';

declare var jquery: any;
declare var authentication: any;
declare var $: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  selected_side = 'counter-terrorist';
  amount = 0.50;
  max_amount: number;
  refreshing = false;
  Error: string = null;
  logged_in = false;
  gameslist = [];
  selected_game: {id, amount, player1: {name, avatar, side}, player2, hash, expires_at} = {
    'id': Math.random(),
    'amount': this.amount.toFixed(2),
    'player1': {
      'name': 'Kingyyy',
      'avatar': '/6c/6c84108b8e292b3c92d2b2cec4abf61e18dd2804.jpg',
      'side': 'counter-terrorist'
    },
    'player2': null,
    'hash': '9186844637c7ca38f5f65a804457d2a0',
    'expires_at': 144444444
  };
  timeConverter = function (UNIX_timestamp){
    const a = new Date(UNIX_timestamp * 1000);
    const hour = a.getHours();
    const min = a.getMinutes();
    const time = this.formatAMPM(hour, min);
    return time;
  };
  formatAMPM(hours, minutes) {
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    const strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
  }
  constructor(private route: ActivatedRoute, private router: Router, private GamesServices: GamesService, private BalanceServices: BalanceService, private Socket: SocketService) {
    if (authentication !== false) {
      this.logged_in = true;
    }
  }
  ngOnInit() {
    if (authentication !== false) {
      setInterval(() => {
        $('#slider-range-max').slider('option', 'max', authentication.balance);
      }, 1000);
      this.Socket.listen('game_update').subscribe(
        data => {
          this.update_game(data.game_id, data.player2);
        },
        err => console.log('err')
      );
      this.Socket.listen('game_expire').subscribe(
        data => {
          this.game_expire(data.game_id);
        },
        err => console.log('err')
      );
      this.Socket.listen('new_game').subscribe(
        data => {
          this.gameslist.push(data);
        },
        err => console.log('err')
      );
      this.max_amount = authentication.balance.toFixed(2);
      $('#slider-range-max').slider({
        range: 'max',
        min: 0.50,
        max: authentication.balance.toFixed(2),
        value: 1,
        slide: (event, ui) => {
          $('#amount').val(ui.value);
          this.amount = ui.value;
        }
      });
      this.updateAmount($('#slider-range-max').slider('value'));
    }
    this.get_games();
  }
  game_expire(game_id: string) {
    for (let i = 0; i < this.gameslist.length; i++) {
      if (this.gameslist[i].id === game_id) {
            this.gameslist.splice(i, 1);
      }
    }
  }
  OnSelectSide(side: string) {
  this.selected_side = side;
  }
  get_games() {
    this.GamesServices.get_games().subscribe(
      list => {
        this.gameslist = list.games;
        $('#terrorist-wheel').knob({max: 100});
        $('#terrorist-wheel').val(list.t_percentage).trigger('change');
        $('#terrorist-wheel').attr('title', list.t_percentage + '% of players have won on the Terrorist Coin in the last 24 hours.').tooltip();
        $('#counterterrorist-wheel').knob({max: 100});
        $('#counterterrorist-wheel').val(list.ct_percentage).trigger('change');
        $('#counterterrorist-wheel').attr('title', list.ct_percentage + '% of players have won on the Counter Terrorist Coin in the last 24 hours.').tooltip();
      },
          err => console.log(err)
    );
  }
  _keyPress(event: any) {
    // console.log(event);
    const pattern = /[0-9\.]/;
    const inputChar = String.fromCharCode(event.charCode);
    if (!pattern.test(inputChar)) {
      event.preventDefault();
    }
  }
  updateAmount(event: any) {
    this.amount = +(+event).toFixed(2);
    if (this.amount > authentication.balance) {
      this.amount = authentication.balance;
    }
    $('#amount').val(this.amount);
    $('#slider-range-max').slider('value', this.amount);
  }
  updateBlur($event) {
    this.amount = +(+$event.target.value).toFixed(2);
    if (this.amount > authentication.balance) {
      this.amount = authentication.balance;
    }
    $('#amount').val(this.amount);
    $('#slider-range-max').slider('value', this.amount);
  }
  update_game(gameid: string, new_player: {name: string, avatar: string, side: string}) {
    for (let i = 0; i < this.gameslist.length; i++) {
      if (this.gameslist[i].id === gameid) {
        this.gameslist[i].player2 = new_player;
        if (new_player != null) {
          setTimeout(() => {
            this.gameslist.splice(i, 1);
            }, 8000);
        }
      }
    }
  }
  OnRefresh() {
    this.refreshing = true;
    const backup_list = this.gameslist;
    this.gameslist = [];
    setTimeout(() => {
      this.get_games();
      this.refreshing = false;
    }, 500);
  }
  OnCreateGame() {
    this.GamesServices.create_game(this.selected_side, this.amount).subscribe(
      res => {
        $('#createGame').modal('toggle');
        this.BalanceServices.remove_balance(this.amount);
        this.router.navigate(['game', res.game_id])
        this.amount = 0;
      },
      err => this.show_error(JSON.parse(err._body).error)
    );
  }
  show_error(error: string) {
    this.Error = error;
    setTimeout(() => this.Error = null, 1000);
  }
  OnCreate() {
    $('#createGame').modal();
  }
  Join_Game_modal(selected_game: {id, amount, player1, player2, hash, expires_at}) {
    if (!this.logged_in) {
      return;
    }
  if (selected_game.player2 === null || selected_game.player2 === undefined) {
    this.selected_game = selected_game;
    $('#joinGame').modal();
  } else {
    this.router.navigate(['game', selected_game.id]);
  }
  }
  Join_Game(selected_game: {id, amount, player1, player2, hash}) {
    if (authentication.balance >= selected_game.amount) {
      this.GamesServices.join_game(selected_game.id).subscribe(
        res => {
          $('#joinGame').modal('toggle');
          this.BalanceServices.remove_balance(selected_game.amount);
          this.router.navigate(['game', selected_game.id]);
        },
        err => this.show_error(JSON.parse(err._body).error)
      );
    } else {
      this.show_error('Insufficient funds');
    }
  }
  GameClick(gameid: string) {
    this.router.navigate(['game', gameid]);
  }

}
