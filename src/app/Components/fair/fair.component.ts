import { Component, OnInit } from '@angular/core';
declare var CryptoJS: any;
@Component({
  selector: 'app-fair',
  templateUrl: './fair.component.html',
  styleUrls: ['./fair.component.css']
})
export class FairComponent implements OnInit {
  Error = null;
  Success = null;
  round_hash;
  round_ticket;
  round_salt;
  constructor() { }
  ngOnInit() {
  }
  show_Error(error: string) {
    this.Error = error;
    this.Success = null;
    setTimeout(() => this.Error = null, 5000);
  }
  show_Success(Success: string) {
    this.Success = Success;
    this.Error = null;
    setTimeout(() => this.Success = null, 5000);
  }
  Calculate() {
    const round_hash = CryptoJS.SHA256(this.round_salt + ':' + this.round_ticket).toString();
    if (this.round_hash === round_hash) {
      this.show_Success('Round is valid.');
    } else {
      this.show_Error('Round is not valid.');
    }
  }

}
