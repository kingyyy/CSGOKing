import * as SteamCommunity from 'steamcommunity';
import { App_Config } from './config';
import * as Log4js from 'log4js';
import * as SteamUser from 'steam-user';
import * as GlobalOffensive from 'globaloffensive';
import * as TradeOfferManager from 'steam-tradeoffer-manager';
import * as FloatsMaster from 'csgo-floats';


Log4js.configure({
  appenders: {
    console: {type: 'console', layout: {type: 'coloured'}},
    file: {type: 'file', filename: 'logs/bot.log'}
  },
  categories: {
    default: {appenders: ['console'], level: 'debug'},
    logger: {appenders: ['file', 'console'], level: 'debug'}
  }
});
const floats = new FloatsMaster();
const client = new SteamUser({
  dataDirectory: null,
});
const csgo = new GlobalOffensive(client);
const manager = new TradeOfferManager({
  steam: client,
  domain: App_Config.domain,
  language: 'en',
  cancelTime: 120000,
});
const LookingToTrade = SteamUser.Steam.EPersonaState.LookingToTrade;
const Log = Log4js.getLogger('logger');
const community = new SteamCommunity();
let bot = {
  id: 0,
  account: {
    accountName: '',
    password: '',
    twoFactorCode: ''
  },
  identity_secret: ''
};
client.addListener('webSession', (sessionID, cookies) => {
  manager.setCookies(cookies, (err) => {
    if (err) {
      console.log(err);
      return;
    }
    return true;
  });
  community.setCookies(cookies);
   client.setPersona(LookingToTrade, 'HuS [Storage #' + bot.id + ']');
  // Initialize CS:GO
  client.gamesPlayed([730]);
  Log.debug(`[bot #${bot.id}] login success`);
});

function time() {
  return new Date().getTime() / 1000;
}

const util = require('util'),
  EventEmitter = require('events').EventEmitter;

function Bot_(bot_info) {
  bot = bot_info;
}

util.inherits(Bot_, EventEmitter);

Bot_.prototype.send_deposit = function (partner, token, items, code, callback) {
  Log.info(`[bot #${bot.id}] Sending Deposit to ${partner} ${token} \nItem: ${items.join(',')}\nwith code ${code}`);
  const senditems = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i] === '') {
      continue;
    }
    senditems.push({
      appid: 730,
      contextid: 2,
      amount: 1,
      assetid: items[i].toString()
    });
  }
  const offer = manager.createOffer('https://steamcommunity.com/tradeoffer/new/?partner=' + partner + '&token=' + token);
  offer.addTheirItems(senditems);
  offer.setMessage('Code : ' + code);
  offer.send((errSend, status) => {
    if (errSend) {
      Log.error(errSend);
      callback(false);
    } else {
      callback(offer.id);
    }
  });
};

Bot_.prototype.send_withdraw = function (partner, token, item, code, callback) {
  Log.info(`[bot #${bot.id}] Sending Withdraw to ${partner} ${token} \nItem: ${item}\nwith code ${code}`);
  const offer = manager.createOffer('https://steamcommunity.com/tradeoffer/new/?partner=' + partner + '&token=' + token);
  offer.addMyItem({
    assetid: item.toString(),
    appid: 730,
    contextid: 2,
    amount: 1,
  });
  offer.setMessage('Code : ' + code);
  offer.send((errSend, status) => {
    if (errSend) {
      Log.error(errSend);
      callback(false);
    } else {
      community.acceptConfirmationForObject(bot.identity_secret, offer.id, (errConfirm) => {
        if (errConfirm) {
          Log.error(errConfirm);
          callback(false);
        }
        callback(offer.id);
      });
    }
  });
};

Bot_.prototype.get_float_nametag = function (inspect, retryCount, callback) {
  const inspectTimeout = setTimeout(() => {
      callback(false);
  }, 2000);
  csgo.inspectItem(inspect, item => {
    clearTimeout(inspectTimeout);
    callback(item.paintwear);
  });
};

Bot_.prototype.get_offer = function (offer_id, callback) {
  manager.getOffer(offer_id, function (err, offer) {
    if (err) {
      Log.error(err);
      return;
    }
    callback(offer.state);
  });
};
Bot_.prototype.login = function () {
  Log.debug(`[bot #${bot.id}] logging`);
  client.logOn(bot.account);
};
module.exports = Bot_;
