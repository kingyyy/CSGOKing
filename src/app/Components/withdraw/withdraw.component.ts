import { Component, OnInit } from '@angular/core';
import { WithdrawService } from '../../Services/withdraw.service';
import { BalanceService } from '../../Services/balance.service';
import { Router } from '@angular/router';
declare var $: any;
declare var authentication: any;

@Component({
  selector: 'app-withdraw',
  templateUrl: './withdraw.component.html',
  styleUrls: ['./withdraw.component.css']
})
export class WithdrawComponent implements OnInit {
  withdraw_items = {};
  original_withdraw_items = {};
  objectKeys = Object.keys;
  selected_item_id = null;
  search_text = '';
  offer_id = 1;
  withdraw_loading = false;
  offer_code: string;
  error = null;
  w_Error = null;

  constructor(private WithdrawServices: WithdrawService, private BalanceServices: BalanceService, private router: Router) {
    if (authentication === false) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    if (authentication === false) {
      this.router.navigate(['/']);
      return;
    }
    this.WithdrawServices.get_withdraw_items().subscribe(
      res => {
        this.original_withdraw_items = res.items;
        this.withdraw_items = res.items;
      },
      err => console.log(err)
    );
  }

  search_for_item() {
    if (this.search_text === null || this.search_text === '') {
      this.withdraw_items = this.original_withdraw_items;
      return;
    }
    this.withdraw_items = {};
    this.objectKeys(this.original_withdraw_items).map(
      item_id => {
        if (this.original_withdraw_items[item_id].full_name.toLowerCase().indexOf(this.search_text.toLowerCase()) !== -1) {
          this.withdraw_items[item_id] = this.original_withdraw_items[item_id];
        }
      }
    );
  }

  open_offer_on_browser(tradeOfferID: string) {
    const winOffer = window.open('https://steamcommunity.com/tradeoffer/' + tradeOfferID + '/', '', 'height=1120,width=1028,resize=yes,scrollbars=yes');
    winOffer.focus();
  }
  inspect_item_metjm() {
    console.log(this.original_withdraw_items[this.selected_item_id].inspect_link.replace('steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20', 'https://metjm.net/csgo/#'));
    const winOffer = window.open(this.original_withdraw_items[this.selected_item_id].inspect_link.replace('steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20', 'https://metjm.net/csgo/#'), '_blank');
    winOffer.focus();
  }

  open_offer_on_steam(tradeOfferID: string) {
    window.top.location.href = 'steam://url/ShowTradeOffer/' + tradeOfferID;
  }
  inspect_item() {
    window.top.location.href = this.original_withdraw_items[this.selected_item_id].inspect_link;
  }

  show_error(error: string) {
    this.error = error;
    setTimeout(() => this.error = null, 5000);
  }

  show_w_error(error: string) {
    this.withdraw_loading = false;
    this.w_Error = error;
    setTimeout(() => this.w_Error = null, 2000);
  }

  withdraw_item() {
  if (this.original_withdraw_items[this.selected_item_id].price > authentication.balance.toFixed(2)) {
    this.show_w_error('Insufficient funds');
    return;
  }
  this.withdraw_loading = true;
    this.WithdrawServices.withdraw_items(this.selected_item_id).subscribe(
      res => {
        this.BalanceServices.remove_balance(this.original_withdraw_items[this.selected_item_id].price);
        this.withdraw_loading = false;
        $('#Item_Comfirm').modal('toggle');
        this.offer_id = res.offer_id;
        this.offer_code = res.offer_code;
        $('#OfferSent').modal();
      },
      err => this.show_w_error(JSON.parse(err._body).error)
    );
  }

  on_change(value) {
    this.withdraw_items = {};
    if (value === 'high') {
      this.withdraw_items = this.original_withdraw_items;
      return;
    }
    for ( let i = this.objectKeys(this.original_withdraw_items).length - 1; i >= 0; ) {
      this.withdraw_items[this.objectKeys(this.original_withdraw_items)[i]] = this.original_withdraw_items[this.objectKeys(this.original_withdraw_items)[i]];
      i--;
    }
  }
  toggle_item_modal() {
    $('#Item_Comfirm').modal('toggle');
  }
  withdraw_select(item_id: string) {
    this.selected_item_id = item_id;
    setTimeout(() => $('#Item_Comfirm').modal(), 500);
  }

}
