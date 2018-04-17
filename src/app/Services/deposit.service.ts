import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';
declare var authentication: any;
declare var API_Service: any;

@Injectable()
export class DepositService {
  auth = new Headers({'Authorization': authentication.token, 'Steamid64' : authentication.steamid64});

  constructor(private http: Http) { }

  get_user_items() {
    return this.http.get('http://' + API_Service + '/Get_User_Items', {headers: this.auth})
      .map(res => res.json());
  }
  get_user_items_cache() {
    return this.http.get('http://' + API_Service + '/Get_User_Items_Cache', {headers: this.auth})
      .map(res => res.json());
  }
  deposit_items(selected_items: any) {
    return this.http.post('http://' + API_Service + '/Deposit_Items', '{"items":[' + selected_items.join(',').replace(/item_/g, '') + ']}', {headers: this.auth})
      .map(res => res.json());
  }
}
