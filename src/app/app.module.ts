import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { OrderByPipe } from './Pipes/orderby.pipe';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './Components/home/home.component';
import { APP_BASE_HREF } from '@angular/common';
import { GameComponent } from './Components/game/game.component';
import { GamesService } from './Services/games.service';
import { ProfileService } from './Services/profile.service';
import { FaqComponent } from './Components/faq/faq.component';
import { TosComponent } from './Components/tos/tos.component';
import { SupportComponent } from './Components/support/support.component';
import { ProfileComponent } from './Components/profile/profile.component';
import { AffiliatesComponent } from './Components/affiliates/affiliates.component';
import { AffiliatesService } from './Services/affiliates.service';
import { BalanceService } from './Services/balance.service';
import { DepositComponent } from './Components/deposit/deposit.component';
import { DepositService } from './Services/deposit.service';
import { WithdrawComponent } from './Components/withdraw/withdraw.component';
import { WithdrawService } from './Services/withdraw.service';
import { RouletteComponent } from './Components/roulette/roulette.component';
import { SocketService } from './Services/socket.service';
import { TruncatePipe } from './Pipes/truncate.pipe';
import { FairComponent } from './Components/fair/fair.component';
import { ChatService } from './Services/chat.service';
import { RankiconPipe } from './Pipes/rankicon.pipe';
import { RankcolorPipe } from './Pipes/rankcolor.pipe';
import { RanknamePipe } from './Pipes/rankname.pipe';


const appRouter: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'Roulette',
    component: RouletteComponent
  },
  {
    path: 'game/:id',
    component: GameComponent
  },
  {
    path: 'FAQ',
    component: FaqComponent
  },
  {
    path: 'TermsOfService',
    component: TosComponent
  },
  {
    path: 'Support',
    component: SupportComponent
  },
  {
    path: 'Profile',
    component: ProfileComponent
  },
  {
    path: 'Affiliates',
    component: AffiliatesComponent
  },
  {
    path: 'Deposit',
    component: DepositComponent
  },
  {
    path: 'Fair',
    component: FairComponent
  },
  {
    path: 'Shop',
    component: WithdrawComponent
  }
];
@NgModule({
  declarations: [
    AppComponent,
    OrderByPipe,
    HomeComponent,
    GameComponent,
    FaqComponent,
    TosComponent,
    SupportComponent,
    ProfileComponent,
    AffiliatesComponent,
    DepositComponent,
    WithdrawComponent,
    RouletteComponent,
    TruncatePipe,
    FairComponent,
    RankiconPipe,
    RankcolorPipe,
    RanknamePipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(appRouter, { useHash: true })
  ],
  providers: [
    {
      provide: APP_BASE_HREF,
      useValue: '/'
    },
    GamesService,
    ProfileService,
    AffiliatesService,
    BalanceService,
    DepositService,
    WithdrawService,
    SocketService,
    ChatService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
