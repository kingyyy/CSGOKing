import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import 'rxjs/add/operator/map';
declare var authentication: any;
declare var Socket_Service: any;


@Injectable()
export class SocketService {
  socket: any;
  connected_t = false;
  socketConnected$ = new BehaviorSubject<boolean>(false);
  constructor() {
    this.socket = io('http://' + Socket_Service, {
      query: 'token=' + authentication.token + '&steamid64=' + authentication.steamid64
    });
    this.socket.on('connect', () => this.socketConnected$.next(true));
    this.socket.on('disconnect', () => this.socketConnected$.next(false));
    this.socketConnected$.asObservable().subscribe( connected => {
      if (connected || this.connected_t ) {
        this.connected_t = true;
      console.log('[Socket.io] authenticated : ', connected);
      }
    });
  }

  Data_Emit(type: string, data: string) {
    this.socket.emit(type, data);
  }
  listen(event: string): Observable<any> {

    return new Observable(observer => {

      this.socket.on(event, data => {
        observer.next(data);
      });

      // observable is disposed
      return () => {
        this.socket.off(event);
      };

    });

  }

}
