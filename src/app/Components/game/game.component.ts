import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GamesService } from '../../Services/games.service';
import { BalanceService } from '../../Services/balance.service';
import { SocketService } from '../../Services/socket.service';
import { Subject } from 'rxjs/Subject';
declare var $: any;
declare var authentication: any;

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
  ngUnsubscribe: Subject<boolean> = new Subject();
  id: string;
  game: {id, amount, player1: {name, avatar, side}, player2: {name, avatar, side}, hash} = null;
  winner = false;
  coin = '../../img/loading_004.gif';
  winner_salt: string;
  winner_ticket: number;
  get_game = false;
  constructor(private route: ActivatedRoute, private router: Router, private GamesServices: GamesService, private BalanceServices: BalanceService, private Socket: SocketService) {
    this.id = route.snapshot.params['id'];
    this.GamesServices.get_game_status(this.id)
.takeUntil(this.ngUnsubscribe)
.subscribe(
      res => {
        this.game = res.game;
        this.get_game = true;
        if (res.winner !== null) {
          this.start_game(res.winner);
        } else {
          this.Socket.listen('game_start_' + this.id)
.takeUntil(this.ngUnsubscribe)
.subscribe(
            data => {
              this.game.player2 = data.player2;
              this.start_game(data.winner);
            },
            err => console.log('err')
          );
        }
      },
      err => router.navigate(['/'])
    );
  }

  ngOnInit() {

  }
  ngOnDestroy() {
      this.ngUnsubscribe.next(true);
      this.ngUnsubscribe.complete();
    $('#fliping_coin').attr('src', '');
  }
  truncate(string: string, limit: number) {
      return (string.length > limit) ? string.substr(0, limit - 1) + '...' : string;
    };
  start_game(winner: {name: string, steamid64: number, side: string, amount: number, salt: string, number: number}) {
  let waiting_time = 0;
  const waiting_timer = 5;
  const coins = 8;
    const randomcoin = Math.floor(Math.random() * coins);
    const side = '#p_' + winner.side;
    console.log(winner.side, randomcoin);
    this.coin = '../../img/flips/' + winner.side.replace('terrorist', 't').replace('counter-', 'c') + '_' + randomcoin + '.gif';
    const timer = setInterval(() => {
    if (waiting_timer === waiting_time) {
      $('.waiting').text('Flipping...');
      $('#fliping_coin').show();
      $('.waiting').css('font-size', 14);
      clearInterval(timer);
      setTimeout(() => {
        $('#fliping_coin').css('display', 'none');
        this.coin = '../../img/loading_004.gif';
        $('.coin_flip').addClass('flipped_' + winner.side);
        $(side).addClass('winner_coin');
        $('.waiting').html('<i class=\'fa fa-exclamation\' aria-hidden=\'true\'></i>Winner: <a style=\'color: #29e07d;\'>' + this.truncate(winner.name, 19) + '</a>');
        this.winner = true;
        this.winner_salt = winner.salt;
        this.winner_ticket = winner.number;
        if (winner.steamid64 === authentication.steamid64) {
          $('#winner_sum').text(winner.amount);
          $('#wonGame').modal();
          // this.BalanceServices.add_balance(winner.amount);
        }
      }, 2000);
    } else {
      $('.waiting').addClass('trans');
      $('.waiting').text(waiting_timer - waiting_time);
      $('.waiting').css('font-size', 21);
      waiting_time++;
      setTimeout(function () {
        $('.waiting').removeClass('trans');
        $('.waiting').css('font-size', 1);
      }, 900);
    }
  }, 1000);
}


}
