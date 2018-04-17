import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { SocketService } from './socket.service';
import { Http, Headers } from '@angular/http';
declare var authentication: any;
declare var API_Service: any;

@Injectable()
export class BalanceService {
  private BalanceUpdater = new Subject<string>();
  BalanceUpdater$ = this.BalanceUpdater.asObservable();
  auth = new Headers({'Authorization': authentication.token, 'Steamid64' : authentication.steamid64});

  constructor(private http: Http) {

  }
  add_balance(balance_to_add: number) {
    authentication.balance = +authentication.balance + +balance_to_add;
    this.BalanceUpdater.next(parseFloat(authentication.balance).toFixed(2));
  }
  remove_balance(balance_to_add: number) {
    authentication.balance = +authentication.balance - +balance_to_add;
    this.BalanceUpdater.next(parseFloat(authentication.balance).toFixed(2));
  }
  get_balance() {
    return this.http.get('http://' + API_Service + '/Get_Balance', {headers: this.auth})
      .map(res => res.json());
  }
  send_balance(user_steamid64: any, amount: number) {
    return this.http.post('http://' + API_Service + '/Send_Balance', '{"user_steamid64":"' + user_steamid64 + '", "amount":' + amount + '}', {headers: this.auth})
      .map(res => res.json());
  }
}
