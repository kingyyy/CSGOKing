import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';
declare var authentication: any;
declare var API_Service: any;

@Injectable()
export class ProfileService {
  auth = new Headers({'Authorization': authentication.token, 'Steamid64' : authentication.steamid64});

  constructor(private http: Http) { }
  get_profile_data() {
    return this.http.get('http://' + API_Service + '/Get_Trade_Link', {headers: this.auth})
      .map(res => res.json());
  }
  update_trade_link(trade_link: string) {
    return this.http.post('http://' + API_Service + '/Update_Trade_Link', '{"trade_link":"' + trade_link + '"}', {headers: this.auth});
  }
}
