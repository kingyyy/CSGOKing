import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { BalanceService } from './Services/balance.service';
import { SocketService } from './Services/socket.service';
import { ChatService } from './Services/chat.service';
declare var $: any;
declare var authentication: any;
declare var window: any;


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  balance: number;
  chatDown = false;
  Chat_Input: string;
  Error = null;
  logged_in = false;
  refreshing = false;
  Chat_Messages = [];
  rank = 0;
  theme = 'dark';
  online = 0;
  selected_message = {
    id : '',
    sender : {
      id : 0,
      steamid64 : 0,
      name : '',
      avatar : '',
      verified : false,
      rank : 1
    },
    text : ''
  };
  @ViewChild('chat') Chat: ElementRef;

  constructor(private BalanceServices: BalanceService, private Socket: SocketService, private ChatServices: ChatService) {
    if (authentication !== false) {
      this.logged_in = true;
    }
    this.Socket.listen('connect').subscribe(
      data => {
        this.Chat_Messages.unshift({
          id : 0,
          text : 'Connected.',
          sender : {
            id : 0,
            name : 'System',
            steamid64 : 0,
            avatar : 'fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
            verified : false,
            rank : 0
          }
        });
      },
      err => console.log('err')
    );
    this.Socket.listen('disconnect').subscribe(
      data => {
        this.Chat_Messages.push({
          id : 0,
          text : 'Connection lost.',
          sender : {
            id : 0,
            name : 'System',
            steamid64 : 0,
            avatar : 'fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
            verified : false,
            rank : 0
          }
        });
          window.top.location.reload();
      },
      err => console.log('err')
    );
    this.ChatServices.get_chat_history().subscribe(
      res => {
        this.Chat_Messages = res;
        this.ChatScrollDown();
        $('.loading-site').fadeOut( 1000 , () => {
          this.ChatScrollDown();
        });
    },
      err => console.log(err)
    );
    setInterval(() => {
    // debugger();
    }, 100);
    BalanceServices.BalanceUpdater$.subscribe(
      res => {
        this.balance = +(parseFloat(res).toFixed(2));
      }
    );
    this.Socket.listen('balance_add_coinflip').subscribe(
      data => {
        setTimeout(() => this.BalanceServices.add_balance(data.balance) , 7000);
      },
      err => console.log('err')
    );
    this.Socket.listen('balance_add').subscribe(
      data => {
        this.BalanceServices.add_balance(data.balance);
      },
      err => console.log('err')
    );
    this.Socket.listen('new_message').subscribe(
      data => {
        this.Chat_Messages.push(data);
        this.ChatScrollDown('fast');
      },
      err => console.log('err')
    );
    this.Socket.listen('remove_message').subscribe(
      data => {
        this.removemessage(data.message_id);
      },
      err => console.log('err')
    );
    this.Socket.listen('online_count').subscribe(
      data => {
        this.online = data.online;
      },
      err => console.log('err')
    );
    this.Socket.listen('clear_chat').subscribe(
      data => {
        this.Chat_Messages = [];
      },
      err => console.log('err')
    );
  }
  ngOnInit() {
    if (authentication !== false) {
      this.balance = authentication.balance.toFixed(2);
      this.rank = authentication.rank;
      localStorage.setItem('authentication', JSON.stringify(authentication));
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = '53f20916-0d4d-4db4-822b-287e81850e0c';
      const d = document;
      const s = d.createElement('script');
      s.src = 'https://client.crisp.chat/l.js';
      s.async = true;
      d.getElementsByTagName('head')[0].appendChild(s);
      window.$crisp.push(['set', 'session:data', [[['id', authentication.id], ['steamid', authentication.steamid64]]]]);
      window.$crisp.push(['set', 'user:nickname', [authentication.name]]);
      window.$crisp.push(['set', 'user:avatar', ['http://cdn.akamai.steamstatic.com/steamcommunity/public/images/avatars/' + authentication.avatar]]);
      window.$crisp.push(['do', 'chat:hide']);
    }
    $('.link').on('click', function() {
      $('.link').removeClass('active');
      $(this).toggleClass('active');
    });
    $('.Hide_SB').on('click', function() {
      $('.nav').toggleClass('collapse');
      $(this).toggleClass('collapse');
    });
    if (parseFloat($(window).width()) < 992) {
      $('.nav').addClass('collapse');
      $('.Hide_SB').addClass('collapse');
    } else {
      $('.nav').removeClass('collapse');
      $('.Hide_SB').removeClass('collapse');
    }
  $(window).on('resize', function(){
  if (parseFloat($(window).width()) < 992) {
    $('.nav').addClass('collapse');
    $('.Hide_SB').addClass('collapse');
  } else {
    $('.nav').removeClass('collapse');
    $('.Hide_SB').removeClass('collapse');
  }
});
    $( document ).ready(() => {
      $('body')
        .click(function (e) {
          if ($(e.target).closest('.message-menu').length !== 1) {
            if ($(e.target).closest('.chat-msg').length !== 1) {
              $('.message-menu').hide();
            }
          }
        });
        if (localStorage.getItem('theme') !== null) {
          this.theme = localStorage.getItem('theme');
          const html = $('html');
          html.removeClass('light-theme');
          html.removeClass('dark-theme');
          html.addClass(this.theme + '-theme');
        } else {
          localStorage.setItem('theme', 'dark');
          const html = $('html');
          html.removeClass('light-theme');
          html.removeClass('dark-theme');
          html.addClass(this.theme + '-theme');
        }
    });
}
  SwitchTheme() {
    const html = $('html');
    html.removeClass('light-theme');
    html.removeClass('dark-theme');
    if ( this.theme === 'light') {
      this.theme = 'dark';
    } else {
      this.theme = 'light';
    }
    localStorage.setItem('theme', this.theme);
    html.addClass(this.theme + '-theme');
  }
  SendCoins(steamid64) {
    this.Chat_Input = '/send ' + steamid64 + ' ';
    $('#chatMessage').focus();
    $('.message-menu').hide();
  }
  SendMessage($event) {
    if ($event.key === 'Enter') {
      if (this.Chat_Input.length > 1) {
        const e = /^\/send ([0-9]*) ([0-9-.]*)/.exec(this.Chat_Input);
        if (e) {
          this.BalanceServices.send_balance(e[1], +e[2]).subscribe(
            res => {
              this.BalanceServices.remove_balance(+e[2]);
              this.Chat_Messages.push(res);
              this.ChatScrollDown('fast');
              this.Chat_Input = null;
            },
            err => this.show_error(JSON.parse(err._body).error)
            );
        } else {
        this.ChatServices.send_chat_message(this.Chat_Input).subscribe(
          res => this.Chat_Input = null,
          err => this.show_error(JSON.parse(err._body).error)
        );
      }
      }
    }
  }
  SelectUser($event, message) {
    if (message.sender.id === 0 || message.sender.rank === 10) {
      return;
    }
    this.selected_message = message;
    const menu = $('.message-menu');
    const elem = $($event.srcElement).position();
    const warp = $('.chatPanel').position();
    menu.show();
    menu.css({
      left: elem.left + warp.left - 125 + 'px',
      top: elem.top + warp.top + 'px'
    });
  }
  MuteUser(user_id) {
    $('.message-menu').hide();
    const time = prompt('Mute this user for ? in hours', '24');
    this.ChatServices.mute_user(user_id, parseFloat(time)).subscribe(
      res => this.Chat_Input = null,
      err => this.show_error(JSON.parse(err._body).error)
    );
  }
  UnMuteUser(user_id) {
    $('.message-menu').hide();
    this.ChatServices.unmute_user(user_id).subscribe(
      res => this.Chat_Input = null,
      err => this.show_error(JSON.parse(err._body).error)
    );
  }
  ClearChat() {
    this.ChatServices.clear_chat_history().subscribe(
      res => this.Chat_Input = null,
      err => this.show_error(JSON.parse(err._body).error)
    );
  }
  RemoveMessage(message_id: string) {
    $('.message-menu').hide();
    this.ChatServices.remove_chat_message(message_id).subscribe(
      res => this.Chat_Input = null,
      err => this.show_error(JSON.parse(err._body).error)
    );
  }
  removemessage(message_id: string) {
    for ( let i = 0; i < this.Chat_Messages.length; i++) {
      if ( this.Chat_Messages[i].id === message_id) {
        this.Chat_Messages.splice(i, 1);
      }
    }
  }
  show_error(error: string) {
    this.Error = error;
    setTimeout(() => this.Error = null, 1000);
  }
  ChatScroll($event) {
    $('.message-menu').hide();
    if (($event.target.scrollHeight - $($event.target).scrollTop() - $($event.target).height()) > 0) {
      this.chatDown = true;
    } else {
      this.chatDown = false;
    }
  }
  ChatScrollDown( type = 'slow' ) {
    $('.chat-body').animate({ scrollTop: this.Chat.nativeElement.scrollHeight }, type);
    this.chatDown = false;
  }
  refresh_balance() {
    this.refreshing = true;
    this.BalanceServices.get_balance().subscribe(
      res => {
        authentication.balance = res.balance.toFixed(2);
        this.balance = res.balance.toFixed(2);
        this.refreshing = false;
      },
      err => console.log(err)
    );
  }
  logout() {
    if ( authentication !== undefined) {
      const win = window.open('/?logout', 'CSGOWild Sign Out Page', 'scrollbars=no');
      const timer = setInterval(function() {
        if (win.closed) {
          clearInterval(timer);
          window.top.location.reload();
        }
      }, 1000);
    }
  }
  login() {
    if ( authentication !== undefined) {
      const win = window.open('/?login', 'CSGOWild Sign In Page', 'height=540,width=984,resize=yes,scrollbars=yes');
      const timer = setInterval(function() {
        if (win.closed) {
          clearInterval(timer);
          window.top.location.reload();
        }
      }, 1000);
    }
  }
}
