 import { Component, EventEmitter, OnInit, Output } from '@angular/core';
 import { AffiliatesService } from '../../Services/affiliates.service';
 import { BalanceService } from '../../Services/balance.service';
 import { Router } from '@angular/router';
 declare var authentication: any;

@Component({
  selector: 'app-affiliates',
  templateUrl: './affiliates.component.html',
  styleUrls: ['./affiliates.component.css']
})

export class AffiliatesComponent implements OnInit {

  ranks = [
    {
      rank: 0,
      bonus_give: 0.35,
      bonus_get: 0.05,
      is_cureent: false
    },
    {
      rank: 1,
      bonus_give: 0.40,
      bonus_get: 0.06,
      is_cureent: false
    },
    {
      rank: 2,
      bonus_give: 0.45,
      bonus_get: 0.07,
      is_cureent: false
    },
    {
    rank: 3,
    bonus_give: 0.50,
    bonus_get: 0.08,
    is_cureent: false
    },
    {
      rank: 4,
      bonus_give: 0.55,
      bonus_get: 0.09,
      is_cureent: false
    },
    {
      rank: 5,
      bonus_give: 0.60,
      bonus_get: 0.10,
      is_cureent: false
    }
    ];
  affiliates_data = {
    redeemed: false,
    current_rank: 1,
    affiliate_code: '',
    total_earnings: 0,
    total_affiliates: 0
  };
  affiliate_code = '';
  redeem_affiliate_code = '';
  refreshing = false;
  refreshing_redeem = false;
  Error = null;
  Error_redeem = null;
  success = false;
  success_redeem = false;
  constructor(private AffiliatesServices: AffiliatesService, private BalanceServices: BalanceService, private router: Router) {
    if (authentication === false) {
      this.router.navigate(['/']);
    }
  }

  update_rank(current_rank: number) {
    for (let i = 0; i < this.ranks.length; i++) {
      if (this.ranks[i].rank === current_rank) {
        this.ranks[i].is_cureent = true;
      }
    }
  }
  show_Error(error: string) {
    this.Error = error;
    this.success = false;
    this.success_redeem = false;
    this.refreshing = false;
    this.refreshing_redeem = false;
    setTimeout(() => this.Error = null, 5000);
  }
  show_Error_redeem(error: string) {
    this.Error_redeem = error;
    this.success = false;
    this.success_redeem = false;
    this.refreshing = false;
    this.refreshing_redeem = false;
    setTimeout(() => this.Error_redeem = null, 5000);
  }
  update_code() {
    this.refreshing = true;
    if (this.affiliate_code == null || this.affiliate_code === '') { return; }
    this.AffiliatesServices.change_affiliate_code(this.affiliate_code).subscribe(
      res => {
        this.refreshing = false;
        this.success = true;
        setTimeout(() => {
          this.success = false;
        }, 1500);
        this.affiliate_code = res.code;
      },
      err => this.show_Error(JSON.parse(err._body).error)
    );
  }
  redeem_code() {
    if (this.redeem_affiliate_code == null || this.redeem_affiliate_code === '') { return; }
    this.refreshing_redeem = true;
    this.AffiliatesServices.redeem_affiliate_code(this.redeem_affiliate_code).subscribe(
      res => {
        this.refreshing_redeem = false;
        this.success_redeem = true;
        this.BalanceServices.add_balance(res.amount);
        setTimeout(() => {
          this.success_redeem = false;
          setTimeout(() => {
            this.affiliates_data.redeemed = true;
          }, 500);
        }, 1500);
      },
      err => this.show_Error_redeem(JSON.parse(err._body).error)
    );
  }
  ngOnInit() {
    if (authentication === false) {
      this.router.navigate(['/']);
      return;
    }
    this.AffiliatesServices.get_affiliates().subscribe(
      res => {
        this.affiliates_data = res;
        this.affiliate_code = this.affiliates_data.affiliate_code;
        this.update_rank(this.affiliates_data.current_rank);
      },
          err => console.log(err)
    );
  }

}
