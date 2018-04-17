import { Component, OnInit } from '@angular/core';
import { ProfileService } from '../../Services/profile.service';
import { Router } from '@angular/router';
declare var authentication: any;

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profile_data =  {
    trade_link: '',
    wager: 0,
    winnings: 0,
    profit: 0,
    history: []
  };
  Error = null;
  trade_link: string;
  refreshing = false;
  success = false;

  constructor(private ProfileServices: ProfileService, private router: Router) {
    if (authentication === false) {
      this.router.navigate(['/']);
    }
  }

  show_error(error: string) {
    this.refreshing = false;
    this.Error = error;
    setTimeout(() => this.Error = null, 5000);
  }

  opengame(game_id: number) {
    this.router.navigate(['game', game_id]);
  }

  update_trade_link() {
    this.refreshing = true;
    this.ProfileServices.update_trade_link(this.trade_link).subscribe(
      res => {
        this.refreshing = false;
        this.success = true;
        setTimeout(() => {
          this.success = false;
        }, 2000);
        },
      err => this.show_error(JSON.parse(err._body).error)
    );
  }

  ngOnInit() {
    if (authentication === false) {
      this.router.navigate(['/']);
    }
    this.ProfileServices.get_profile_data().subscribe(
      res => {
        this.profile_data = res;
        this.trade_link = res.trade_link;
        },
      err => this.show_error(JSON.parse(err._body).error)
    );
  }

}
