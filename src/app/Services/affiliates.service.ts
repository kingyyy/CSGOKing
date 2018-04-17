import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';
declare var authentication: any;
declare var API_Service: any;

@Injectable()
export class AffiliatesService {
  auth = new Headers({'Authorization': authentication.token, 'Steamid64' : authentication.steamid64});

  constructor(private http: Http) { }
  get_affiliates() {
    return this.http.get('http://' + API_Service + '/Affiliates', {headers: this.auth})
      .map(res => res.json());
  }
  redeem_affiliate_code(code: string) {
    return this.http.post('http://' + API_Service + '/Redeem_Affiliate', '{"code":"' + code + '"}', {headers: this.auth})
      .map(res => res.json());
  }
  change_affiliate_code(code: string) {
    return this.http.post('http://' + API_Service + '/Change_Affiliate_Code', '{"code":"' + code + '"}', {headers: this.auth})
      .map(res => res.json());
  }
}
