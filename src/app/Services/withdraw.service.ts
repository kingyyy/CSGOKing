import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';
declare var authentication: any;
declare var API_Service: any;

@Injectable()
export class WithdrawService {
  auth = new Headers({'Authorization': authentication.token, 'Steamid64' : authentication.steamid64});

  constructor(private http: Http) { }

  get_withdraw_items() {
    return this.http.get('http://' + API_Service + '/Get_Withdraw_Items', {headers: this.auth})
      .map(res => res.json());
  }
  withdraw_items(selected_item: any) {
    return this.http.post('http://' + API_Service + '/Withdraw_Items', '{"item":"' + selected_item.replace('item_', '') + '"}', {headers: this.auth})
      .map(res => res.json());
  }
}
