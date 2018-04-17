import { Http, Headers } from '@angular/http';
import { Injectable } from '@angular/core';
import 'rxjs/Rx';
declare var authentication: any;
declare var API_Service: any;

@Injectable()
export class GamesService {
  auth = new Headers({'Authorization': authentication.token, 'Steamid64' : authentication.steamid64});

  constructor(private http: Http) {}

  get_games()  {
    return this.http.get('http://' + API_Service + '/Get_Games')
      .map(res => res.json());
  }
  create_game(side: string, amount: number) {
    return this.http.post('http://' + API_Service + '/Create_Game', '{"side":"' + side + '", "amount":' + amount + '}', {headers: this.auth})
      .map(res => res.json());
  }
  join_game(game_id: string) {
    return this.http.post('http://' + API_Service + '/Join_Game', '{"game_id":"' + game_id + '"}', {headers: this.auth})
      .map(res => res.json());
  }
  get_game_status(game_id: string) {
    return this.http.get('http://' + API_Service + '/Get_Game_Status/' + game_id)
      .map(res => res.json());
  }
  get_roulette_status() {
    return this.http.get('http://' + API_Service + '/Get_Roulette_Status')
      .map(res => res.json());
  }
  join_roulette_round(amount: number, side: string) {
    return this.http.post('http://' + API_Service + '/Join_Roulette_Round/' + side, '{"amount": ' + amount + '}', {headers: this.auth})
      .map(res => res.json());
  }
}
