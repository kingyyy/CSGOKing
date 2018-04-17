import { Component, OnInit } from '@angular/core';
import { DepositService } from '../../Services/deposit.service';
import { Router } from '@angular/router';
declare var $: any;
declare var authentication: any;

@Component({
  selector: 'app-deposit',
  templateUrl: './deposit.component.html',
  styleUrls: ['./deposit.component.css']
})
export class DepositComponent implements OnInit {
  total_price = 0;
  user_items = {};
  original_user_items = {};
  objectKeys = Object.keys;
  selected_items = {};
  max_select = 8;
  depositing = false;
  offer_id = 1;
  offer_code: string;
  error = null;
  refreshing = false;
  search_text = null;
  constructor(private DepositServices: DepositService, private router: Router) {
    if (authentication === false) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    if (authentication === false) {
      this.router.navigate(['/']);
      return;
    }
    this.DepositServices.get_user_items_cache().subscribe(
      res => {
        this.original_user_items = res.items;
        this.user_items = res.items;
      },
      err => this.show_error(JSON.parse(err._body).error)
    );
  }
  search_for_item() {
    if (this.search_text === null || this.search_text === '') {
      this.user_items = this.original_user_items;
      return;
    }
    this.user_items = {};
    this.objectKeys(this.original_user_items).map( item_id => {
      if (this.original_user_items[item_id].full_name.toLowerCase().indexOf(this.search_text.toLowerCase()) !== -1) {
        this.user_items[item_id] = this.original_user_items[item_id];
      }
    });
  }

  refresh_items() {
    this.refreshing = true;
    this.search_text = '';
    this.user_items = {};
    this.DepositServices.get_user_items().subscribe(
      res => {
        this.user_items = res.items;
        this.refreshing = false;
      },
      err => {
        this.show_error(JSON.parse(err._body).error);
        this.refreshing = false;
      }
    );
  }
  select_item(item_id: string) {
    if (this.objectKeys(this.selected_items).length >= this.max_select) {
      this.show_error('Max items to deposit is ' + this.max_select + ' item per trade');
      return;
    }
    if (this.user_items[item_id].price === 0) {
      return;
    }
    this.selected_items[item_id] = this.user_items[item_id];
    this.total_price += +this.user_items[item_id].price;
    delete this.user_items[item_id];
  }

  unselect_item(item_id: string) {
    this.user_items[item_id] = this.selected_items[item_id];
    this.total_price -= +this.selected_items[item_id].price;
    delete this.selected_items[item_id];
  }

  open_offer_on_browser(tradeOfferID: any) {
    const winOffer = window.open('https://steamcommunity.com/tradeoffer/' + tradeOfferID + '/', '', 'height=1120,width=1028,resize=yes,scrollbars=yes');
    winOffer.focus();
  }

  open_offer_on_steam(tradeOfferID: any) {
   window.top.location.href = 'steam://url/ShowTradeOffer/' + tradeOfferID;
  }

  show_error(error: string) {
    this.error = error;
    this.depositing = false;
    setTimeout(() => this.error = null, 5000);
  }
  deposit_items() {
    this.depositing = true;
    this.DepositServices.deposit_items(this.objectKeys(this.selected_items)).subscribe(
      res => {
        this.offer_id = res.offer_id;
        this.offer_code = res.offer_code;
        $('#OfferSent').modal();
        this.depositing = false;
      },
      err => this.show_error(JSON.parse(err._body).error)
    );
  }
}
