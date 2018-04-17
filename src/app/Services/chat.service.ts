import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';
declare var authentication: any;
declare var API_Service: any;


@Injectable()
export class ChatService {
  auth = new Headers({'Authorization': authentication.token, 'Steamid64' : authentication.steamid64});

  constructor(private http: Http) { }

  get_chat_history() {
    return this.http.get('http://' + API_Service + '/Get_Chat_History')
      .map(res => res.json());
  }

  send_chat_message(message: string) {
    return this.http.post('http://' + API_Service + '/Send_Chat_Message', '{"message":"' + message + '"}', {headers: this.auth})
      .map(res => res.json());
  }

  remove_chat_message(message_id: string) {
    return this.http.post('http://' + API_Service + '/Remove_Chat_Message', '{"message_id":"' + message_id + '"}', {headers: this.auth})
      .map(res => res.json());
  }

  mute_user(user_id: any, hours: number) {
    if (hours <= 0) {
      return;
    }
    return this.http.post('http://' + API_Service + '/Mute_User', '{"user_id":"' + user_id + '", "hours": ' + hours + '}', {headers: this.auth})
      .map(res => res.json());
  }

  unmute_user(user_id: any) {
    return this.http.post('http://' + API_Service + '/UnMute_User', '{"user_id":"' + user_id + '"}', {headers: this.auth})
      .map(res => res.json());
  }

  clear_chat_history() {
    return this.http.get('http://' + API_Service + '/Cleat_Chat_History', {headers: this.auth})
      .map(res => res.json());
  }
}
