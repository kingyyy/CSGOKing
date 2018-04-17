import { Component, OnDestroy, OnInit } from '@angular/core';
import { GamesService } from '../../Services/games.service';
import { BalanceService } from '../../Services/balance.service';
import { SocketService } from '../../Services/socket.service';
import { Subject } from 'rxjs/Subject';
declare var buzz: any;
declare var authentication: any;
declare var $: any;

@Component({
  selector: 'app-roulette',
  templateUrl: './roulette.component.html',
  styleUrls: ['./roulette.component.css']
})
export class RouletteComponent implements OnInit, OnDestroy {
  ngUnsubscribe: Subject<boolean> = new Subject();
  amount: number;
  last = 0;
  Error = null;
  my_id = authentication.id;
  winner_side = null;
  logged_in = false;
  placing = false;
  last_rolls = [];
  selected_side = 'terrorist';
  round_hash = '3fa350fc1ae18985ebc7e0be3c1ce48f1fd3f566587519d83d21ea919ab8ad6a';
  _soundOn = false;
  _rolling = false;
  _order =  [0, 11, 5, 10, 6, 9, 7, 8, 1, 14, 2, 13, 3, 12, 4];
  _t =  [1, 2, 3, 4, 5, 6, 7];
  _ct =  [8, 9, 10, 11, 12, 13, 14];
  _position = 0;
  countDownInterval: any;
  winner_circle = false;
  _bets = {
    t: [],
    wild: [],
    ct: []
  };
  _totals = {
    t: 0,
    wild: 0,
    ct: 0
  };
  timeLeft;
  selected_roll = {
    hash: '',
    salt: '',
    random: 5
  };
  _tileWidth = 132;
  sounds = {
    roll: new buzz.sound('/sounds/rolling.wav', {preload: true}),
    tone: new buzz.sound('/sounds/tone.wav', {preload: true})
};
  constructor(private GamesServices: GamesService, private BalanceServices: BalanceService, private Socket: SocketService) {
    if (authentication !== false) {
      this.logged_in = true;
    }
    this.Socket.listen('roulette_new_bet' )
.takeUntil(this.ngUnsubscribe)
.subscribe(
      data => {
        this._bets[data.side].push(data.bet);
        this._totals[data.side] += data.bet.amount;
      },
      err => console.log('err')
    );
    this.Socket.listen('roulette_start' )
.takeUntil(this.ngUnsubscribe)
.subscribe(
      data => {
        this.rotateTo(data.round_data, data.diff);
      },
      err => console.log('err')
    );
    this.Socket.listen('roulette_new_round' )
.takeUntil(this.ngUnsubscribe)
.subscribe(
      data => {
        this.newRound(data.round_time);
        this.round_hash = data.round_hash;
      },
      err => console.log('err')
    );
  }
  ngOnInit() {
    this.GamesServices.get_roulette_status()
.takeUntil(this.ngUnsubscribe)
.subscribe(
      res => {
        this.last_rolls = res.history;
        this.newRound(res.round_time, res.bets);
        this.round_hash = res.round_hash;
        this._totals = res.totals;
      },
      err => console.log(err)
    );
    $( document ).ready(function() {
      $('body')
        .click(function (e) {
          if ($(e.target).closest('#past-queue-menu-wrapper').length !== 1) {
            if ($(e.target).closest('.last').length !== 1) {
              $('#past-queue-menu-wrapper').hide();
            }
          }
        });
    });
  }
  ngOnDestroy() {
    this.last = 0;
    this.placing = false;
    this.Error = null;
    clearInterval(this.countDownInterval);
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();
  }
  show_Error(error: string) {
    this.Error = error;
    this.placing = false;
    setTimeout(() => this.Error = null, 2500);
  }
  PlaceBet() {
    this.last = this.amount;
    this.placing = true;
    if (authentication.balance >= this.amount) {
      this.GamesServices.join_roulette_round(this.amount, this.selected_side.replace('counter-', 'c').replace('terrorist', 't'))
.takeUntil(this.ngUnsubscribe)
.subscribe(
        res => {
          this.placing = false;
          this.BalanceServices.remove_balance(this.amount);
        },
        err => this.show_Error(JSON.parse(err._body).error)
      );
    } else {
      this.show_Error('Insufficient funds');
    }
  }
  HistoryClick($event, hash, salt, random) {
    this.selected_roll.hash = hash;
    this.selected_roll.salt = salt;
    this.selected_roll.random = random;
    const elem = $($event.srcElement).position();
    const warp = $('.latest').position();
    $('#past-queue-menu-wrapper').show();
    $('#past-queue-menu-wrapper').css({
      left: elem.left + warp.left - 40 + 'px',
      top: elem.top + warp.top + 80 + 'px'
    });
  }
  select_side(side: string) {
    this.selected_side = side;
  }
  rotateTo(round_data, diff, rotations = 5) {
    const wheel = $('.roulette-wheel');
    $('.rolling').fadeOut(200);
    let order = 0;
    let winner_side = 'wild';
    if (round_data.roll_number < 45) {
      order = this._t[Math.floor(Math.random() * this._t.length)];
      winner_side = 't';
    } else if (round_data.roll_number > 55) {
      order = this._ct[Math.floor(Math.random() * this._ct.length)];
      winner_side = 'ct';
    }
    const self = this;
    rotations = rotations || 5;
    if (diff < 0.1) {
      diff = 0.1;
    }
    if (diff > 0.9) {
      diff = 0.9;
    }
    diff = diff - 0.5 || 0;
    this._position = (this._order.indexOf(order) + diff) * this._tileWidth;
    const position = this._position - (wheel.width() - 15 * this._tileWidth) / 2;
    this._rolling = true;
    if (this._soundOn) {
      this.sounds.roll.play();
    }
    const act_pos = -1 * (position + rotations * 15 * this._tileWidth);
    wheel.animate({backgroundPositionX: act_pos}, 7000, $.bez([.06, .79, 0, 1]), function () {
      setTimeout(function () {
        self._position -= diff * self._tileWidth;
        wheel.animate({
          backgroundPositionX: (-1 * (self._position - (wheel.width() - self._tileWidth * 15) / 2))
        }, 300, 'linear', function () {
          self.positionFix();
          self.winner_circle = true;
          self.winner_side = winner_side;
          setTimeout(() => {
            self.winner_circle = false;
            self.winner_side = null;
          }, 3000);
        }, 300);
      }, 300);

      if (this._soundOn) {
        self.sounds.tone.play();
      }
      self._rolling = false;
      self.positionFix();
      self.updateHistory(round_data);
    });
  }
  positionFix() {
    const wheel = $('.roulette-wheel');
    if (this._rolling) {
      return;
    }
    wheel.css({'background-position-x': -1 * (this._position - (wheel.width() - this._tileWidth * 15) / 2)});
  }
  updateHistory(round_data) {
    this.last_rolls.shift();
    this.last_rolls.push({
      roll_id: round_data.roll_id,
      roll_hash: round_data.roll_hash,
      roll_salt: round_data.roll_salt,
      roll_number: round_data.roll_number
    });
  }
  newRound(time, bets = {
    t: [],
    wild: [],
    ct: []
  }) {
    this._bets = bets || {
        t: [],
        wild: [],
        ct: []
      };
    this._totals = {
      t: 0,
      wild: 0,
      ct: 0
    };
    this.startCountDown(time);
  }
  UpdateAmount(action: string) {
    if (this.amount === undefined) {
      this.amount = 0;
    }
    switch (action) {
      case 'clear':
        this.amount = 0;
        break;
      case 'last':
        this.amount = this.last;
        break;
      case '0.10':
        this.amount += 0.10;
        break;
      case '1':
        this.amount += 1;
        break;
      case '10':
        this.amount += 10;
        break;
      case '1/2':
        this.amount = +((this.amount / 2).toFixed(2));
        break;
      case 'x2':
        this.amount = +((this.amount * 2).toFixed(2));
        break;
      case 'max':
        this.amount = authentication.balance;
        break;
    }
  }
  _keyPress(event: any) {
    // console.log(event);
    const pattern = /[0-9\.]/;
    const inputChar = String.fromCharCode(event.charCode);
    if (!pattern.test(inputChar)) {
      event.preventDefault();
    }
  }
  updateBlur($event) {
    this.amount = +(+$event.target.value).toFixed(2);
    if (this.amount > authentication.balance) {
      this.amount = authentication.balance;
    }
    $('#minesBet').val(this.amount);
  }
  startCountDown(time) {
    clearInterval(this.countDownInterval);
    this.timeLeft = new Date().getTime() + (time * 1000);
    if (time === 0) {
      return;
    }

    this.countDownInterval = setInterval(() => {
      this.updateTimer();
      if ((this.timeLeft - new Date().getTime()) / 1000 < 0) {
        clearInterval(this.countDownInterval);
      }
    }, 10);
  }
  updateTimer() {
    if ((this.timeLeft - new Date().getTime()) / 1000 > 0) {
      $('.rolling').fadeIn(200);
      $('.rolling-inner').html('<div>' + ((this.timeLeft - new Date().getTime()) / 1000).toFixed(2).replace('.', ':') + '</div>');
    } else {
      $('.rolling').fadeOut(200);
    }
  }

}
