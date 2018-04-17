import { Component, OnDestroy, OnInit } from '@angular/core';
declare var $: any;
declare var authentication: any;
declare var window: any;

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.css']
})
export class SupportComponent implements OnInit, OnDestroy {
  timer: any;
  constructor() { }

  ngOnInit() {
    if (authentication !== false) {
      window.$crisp.push(['do', 'chat:show']);
      this.timer = setInterval(() => {
        $('.crisp-42').attr('style', function (i, sh) {
          return sh + 'right: 305px!important;';
        });
        $('.crisp-41').attr('style', function (i, sh) {
          return sh + 'right: 305px!important;';
        });
      }, 100);
    }
  }
  ngOnDestroy() {
    if (authentication !== false) {
      window.$crisp.push(['do', 'chat:hide']);
      clearInterval(this.timer);
    }
  }

}
