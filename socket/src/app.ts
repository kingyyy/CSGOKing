import * as _ from 'lodash';
import * as socketio from 'socket.io';
import * as express from 'express';
import * as os from 'os';
import * as bodyParser from 'body-parser';
import * as crypto from 'crypto';
import * as payload from 'request-payload';
import * as convertor from 'steam-id-convertor';
import * as NodeCache from 'node-cache';
import * as RateLimit from 'express-rate-limit';
import * as uuid_v1 from 'uuid/v1';
import * as uuid_v5 from 'uuid/v5';
import * as Log4js from 'log4js';
import * as got from 'got';
import { MySQL_Pool } from './pool';
import { App_Config } from './config';
import { forEachAsync } from 'futures';
// import * as Monitor from 'express-status-monitor';
import * as SteamTotp from 'steam-totp';


const Bot_Login = require('./bot');

Log4js.configure({
  appenders: {
    console: {type: 'console', layout: {type: 'coloured'}},
    file: {type: 'file', filename: 'logs/connect.log'},
    roulettel: {type: 'file', filename: 'logs/roulette.log'},
    file2: {type: 'file', filename: 'logs/log.log'}
  },
  categories: {
    default: {appenders: ['console'], level: 'debug'},
    logger: {appenders: ['file2', 'console'], level: 'debug'},
    connectlogger: {appenders: ['file'], level: 'debug'},
    roulette: {appenders: ['roulettel'], level: 'debug'}
  }
});
const Log = Log4js.getLogger('logger');
const connect_Logger = Log4js.getLogger('connectlogger');
const roulette_Logger = Log4js.getLogger('roulette');
const prices = [];
let chat_history = [];
const bot_manager = [];
const king = new Bot_Login({
  id: 1,
  account : {
    accountName: App_Config.bots_login[0].username,
    password: App_Config.bots_login[0].password,
    twoFactorCode: SteamTotp.generateAuthCode(App_Config.bots_login[0].shared_secret)
  },
  identity_secret : App_Config.bots_login[0].identity_secret
});
bot_manager[1] = {
  bot_id : 1,
  bot : king
};
bot_manager[1].bot.login();
let roll_timer = 28;
let roll_started = false;
let roll_join = true;
const next_round = {
  hash: null,
  ticket: null,
  salt: null
};
const _bets = {
  t: [],
  wild: [],
  ct: []
};
const _totals = {
  t: 0,
  wild: 0,
  ct: 0
};
MySQL_Pool.getConnection(function () {
  MySQL_Pool.query('SELECT * FROM prices', function (error, results) {
    for (let i = 0; i < results.length; i++) {
      prices[results[i].name] = results[i].price;
    }
setTimeout(() => {
  for (let bot_id = 0; bot_id < App_Config.bots.length; bot_id++) {
    update_bot_shop(bot_id, '76561198324547183');
  }
}, 5000);
    setTimeout(check_trades, 5000);
    const salt = new Buffer(crypto.randomBytes(16).toString('base64')).toString('base64');
    const ticket = Math.random() * 100;
    next_round.hash = crypto.createHash('sha256').update(salt + ':' + ticket).digest('hex');
    next_round.salt = salt;
    next_round.ticket = ticket;
    roulette_Logger.debug('Roulette Count down Started');
    setInterval(() => {
      if (!roll_started) {
        if (roll_timer <= 0) {
          roll_join = false;
          roll_started = true;
          roll();
        } else {
          roll_timer--;
        }
      }
    }, 1000);
  });
});

const Cache_Service = new NodeCache();
const secret = App_Config.secret;
const port = App_Config.PORT || 1338;
const env = App_Config.env || 'development';
const API_limiter = new RateLimit({
  windowMs: 500,
  max: 1,
  delayMs: 250
});
const app = express();
const sockets = {};
const house_edg = App_Config.house_edg;

// App Functions

// app.use(Log4js.connectLogger(Logger, { level: 'auto' }));
app.set('port', port);
app.set('env', env);
app.use(bodyParser.json());
// app.use(Monitor({
//   title: App_Config.site_name + ' | App Status',
//   path: '/kingyyy_status'
// }));
app.use(bodyParser.urlencoded({extended: false}));
app.use(function (req, res, next) {
  // Allow Headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, steamid64');

  // Allow Options Method

  if (req.method === 'OPTIONS') {
    res.status(200).send('OPTIONS true');
    return;
  }
  next();
});
function auth(req, res, next) {
  // Authentication
  const steamid64 = req.headers.steamid64;
  const token = req.headers.authorization;
  const hash_n1 = crypto.createHash('sha256').update(steamid64 + secret).digest('hex');
  const hash_n2 = crypto.createHash('sha256').update(hash_n1 + secret).digest('hex');
  if (token === hash_n1 + '.' + hash_n2) {
    connect_Logger.debug(req.headers.steamid64 + ' ' + req.url);
    next();
  } else {
    connect_Logger.error(req.headers.steamid64 + ' ' + req.url);
    res.status(401).send('Unauthorized');
  }
}
app.use(Log4js.connectLogger(connect_Logger, {level: 'auto'}));
// End App Functions


// Routes

const router = express.Router();

router.get('/', (req, res) => {
  res.send(App_Config.site_name + ' Server.');
});

router.get('/Get_Games', Get_Games);

router.get('/Get_Balance', auth, API_limiter, Get_Balance);

router.post('/Send_Balance', auth, API_limiter, Send_Balance);

router.post('/Create_Game', auth, API_limiter, Create_Game);

router.post('/Join_Game', auth, API_limiter, Join_Game);

router.get('/Get_Game_Status/:game_id', Get_Game_Status);

router.get('/Get_Trade_Link', auth, Get_Trade_Link);

router.post('/Update_Trade_Link', auth, Update_Trade_Link);

router.get('/Get_Withdraw_Items', Get_Withdraw_Items);

router.post('/Withdraw_Items', auth, API_limiter, Withdraw_Items);

router.get('/Get_User_Items', auth, Get_User_Items);

router.get('/Get_User_Items_Cache', auth, Get_User_Items_Cache);

router.post('/Deposit_Items', auth, API_limiter, Deposit_Items);

router.get('/Affiliates', auth, Affiliates);

router.post('/Redeem_Affiliate', auth, API_limiter, Redeem_Affiliate);

router.post('/Change_Affiliate_Code', auth, API_limiter, Change_Affiliate_Code);

router.get('/Get_Roulette_Status', Get_Roulette_Status);

router.post('/Join_Roulette_Round/:side', auth, API_limiter, Join_Roulette_Round);

router.get('/Get_Chat_History', Get_Chat_History);

router.post('/Send_Chat_Message', auth, API_limiter, Send_Chat_Message);

router.post('/Remove_Chat_Message', auth, API_limiter, Remove_Chat_Message);

router.post('/Mute_User', auth, API_limiter, Mute_User);

router.post('/UnMute_User', auth, API_limiter, UnMute_User);

router.get('/Cleat_Chat_History', auth, API_limiter, Cleat_Chat_History);

app.use('/api', router);


// End Routes


// Server Start

const server = app.listen(app.get('port'), () => {
  Log.info(App_Config.site_name + ' server listening on port ' + app.get('port'));
});

const io = socketio(server, {'origins': '*:*'});

// End Server Start


// Socket Functions

io.use(function (socket, next) {

  // Authentication
  if (socket.handshake.query.steamid64 !== undefined) {
    const steamid64 = socket.handshake.query.steamid64;
    const token = socket.handshake.query.token;
    const hash_n1 = crypto.createHash('sha256').update(steamid64 + secret).digest('hex');
    const hash_n2 = crypto.createHash('sha256').update(hash_n1 + secret).digest('hex');
    if (token === hash_n1 + '.' + hash_n2) {
      next();
    } else {
      next(new Error('Token unknown'));
    }
  } else {
    next();
  }
  return;
});
io.on('connection', (client) => {
  io.emit('online_count', {
    online : Object.keys(io.sockets.connected).length
  });
  if (client.handshake.query.steamid64 !== undefined) {
    if (sockets[client.handshake.query.steamid64] !== undefined) {
        sockets[client.handshake.query.steamid64].emit('new_message', {
          id : uuid_v1(),
          text : 'You have logged from somewhere else this session has been disconnected.',
          sender : {
            id : 0,
            name : 'System',
            steamid64 : 0,
            avatar : 'fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
            verified : false,
            rank : 0
          }
        });
      sockets[client.handshake.query.steamid64].disconnect();
    }
  sockets[client.handshake.query.steamid64] = client;
  }

  client.emit('host', os.hostname());
});
setInterval(() => {
  io.emit('online_count', {
    online : Object.keys(io.sockets.connected).length
  });
}, 1000);

// End Socket Functions

function Send_Balance(req, res) {
  payload(req, function (body) {
    body = JSON.parse(body);
    body.amount = +(body.amount);
    if (!_.isNumber(body.user_steamid64) || !_.isNumber(body.amount)) {
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    if (body.amount < 0.50) {
      res.status(406).json({success: false, error: 'The minimum coins to send is 0.50'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (error, results) {
      if (error) {
        Log.error(error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      if (results[0].balance < body.amount) {
        res.status(406).json({success: false, error: 'Insufficient funds'});
        return;
      }
      if (+results[0].steamid === +body.user_steamid64) {
        res.status(406).json({success: false, error: 'You can not send coins to yourself'});
        return;
      }
      if (results[0].total_bet < 50) {
        res.status(406).json({success: false, error: 'You must wager at least 50.00 coins before you can use this feature'});
        return;
      }
      MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [body.user_steamid64], function (error2, results2) {
        if (error2) {
          Log.error(error2);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        if (results2.length === 0) {
          res.status(406).json({success: false, error: 'This user does not exist'});
          return;
        }
        MySQL_Pool.query('UPDATE users SET balance = balance - ? Where steamid = ?', [body.amount, req.headers.steamid64], function (u_error) {
          if (u_error) {
            Log.error(u_error);
            res.status(500).json({success: false, error: 'Something went wrong'});
            return;
          }
          MySQL_Pool.query('UPDATE users SET balance = balance + ? Where steamid = ?', [body.amount, body.user_steamid64], function (u_error2) {
            if (u_error2) {
              Log.error(u_error2);
              res.status(500).json({success: false, error: 'Something went wrong'});
              return;
            }
            MySQL_Pool.query('INSERT INTO `transactions` (`from_id`, `to_id`, `amount`) VALUES (?, ?, ?)', [results[0].id, results2[0].id, body.amount], function (u_error3) {
            if (u_error3) {
              Log.error(u_error3);
              res.status(500).json({success: false, error: 'Something went wrong'});
              return;
            }
            res.status(200).json({
              id : uuid_v1(),
              text : 'You have sent ' + body.amount.toFixed(2) + ' coins to ' + results2[0].nickname + '.',
              sender : {
                id : 0,
                name : 'System',
                steamid64 : 0,
                avatar : 'fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
                verified : false,
                rank : 0
              }
            });
              if (sockets[body.user_steamid64] !== undefined) {
                sockets[body.user_steamid64].emit('balance_add', {balance: body.amount});
                sockets[body.user_steamid64].emit('new_message', {
                  id : uuid_v1(),
                  text : 'You have received ' + body.amount.toFixed(2) + ' coins from ' + results[0].nickname + '.',
                  sender : {
                    id : 0,
                    name : 'System',
                    steamid64 : 0,
                    avatar : 'fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
                    verified : false,
                    rank : 0
                  }
                });
              }
            });
          });
        });
      });
    });
  });
}
function Get_Chat_History(req, res) {
  res.status(200).json(chat_history);
}
function Send_Chat_Message(req, res) {
  payload(req, function (body) {
    body = JSON.parse(body);
    if (!_.isString(body.message)) {
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    if (body.message.length > 200) {
      res.status(406).json({success: false, error: 'The maximum chat message is 200 letter'});
      return;
    }
    if (body.message.length < 2) {
      res.status(406).json({success: false, error: 'The minimum chat message is 2 letters'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (error, results) {
      if (error) {
        Log.error(error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      const time_now = Math.floor(Date.now() / 1000);
      if (results[0].muted > time_now) {
        res.status(406).json({success: false, error: 'You have been muted from chat try again in ' + (results[0].muted - time_now) + ' seconds'});
        return;
      }
      const verified = results[0].verified;
      const rank = results[0].rank;
      res.status(200).json({success: true, error: null});
      const message = {
        id : uuid_v1(),
        text : body.message,
        sender : {
          id : results[0].id,
          name : results[0].nickname,
          steamid64 : req.headers.steamid64,
          avatar : results[0].avatar,
          verified : !!verified,
          rank : rank
        }
      };
      if (chat_history.length > 20) {
        chat_history.shift();
      }
      chat_history.push(message);
      io.emit('new_message', message);
    });
  });
}
function removemessage(message_id: string) {
  for ( let i = 0; i < chat_history.length; i++) {
    if ( chat_history[i].id === message_id) {
      chat_history.splice(i, 1);
    }
  }
}
function Remove_Chat_Message(req, res) {
  payload(req, function (body) {
    body = JSON.parse(body);
    if (!_.isString(body.message_id)) {
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (error, results) {
      if (error) {
        Log.error(error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      if (results[0].rank < 7) {
        res.status(500).json({success: false, error: 'You do not have permission'});
        return;
      }
      res.status(200).json({success: true, error: null});
      removemessage( body.message_id );
      io.emit('remove_message', {
         message_id : body.message_id
      });
    });
  });
}
function Mute_User(req, res) {
  payload(req, function (body) {
    body = JSON.parse(body);
    if (!_.isString(body.user_id) && !_.isNumber(body.user_id)) {
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (error, results) {
      if (error) {
        Log.error(error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      if (results[0].rank < 7) {
        res.status(500).json({success: false, error: 'You do not have permission'});
        return;
      }
      const muted_time = Math.floor(Date.now() / 1000) + (body.hours * 3600);
      MySQL_Pool.query('UPDATE users SET muted = ? Where id = ?', [muted_time, body.user_id], function (u_error) {
        if (u_error) {
          Log.error(u_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        res.status(200).json({success: true, error: null});
      });
    });
  });
}
function UnMute_User(req, res) {
  payload(req, function (body) {
    body = JSON.parse(body);
    if (!_.isString(body.user_id) && !_.isNumber(body.user_id)) {
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (error, results) {
      if (error) {
        Log.error(error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      if (results[0].rank < 7) {
        res.status(500).json({success: false, error: 'You do not have permission'});
        return;
      }
      const muted_time = 0;
      MySQL_Pool.query('UPDATE users SET muted = ? Where id = ?', [muted_time, body.user_id], function (u_error) {
        if (u_error) {
          Log.error(u_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        res.status(200).json({success: true, error: null});
      });
    });
  });
}
function Cleat_Chat_History(req, res) {
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (error, results) {
      if (error) {
        Log.error(error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      if (results[0].rank < 7) {
        res.status(500).json({success: false, error: 'You do not have permission'});
        return;
      }
      chat_history = [];
      io.emit('clear_chat', {});
      res.status(200).json({success: true, error: null});
    });
}










// ****************************************************************
function Get_Games(req, res) {
  MySQL_Pool.query('SELECT * FROM coinflip Where finished = 0', function (error, results) {
    if (error) {
      Log.error(error);
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    MySQL_Pool.query('SET @total = ( SELECT count( * ) AS \'total\' FROM `coinflip` WHERE `finished` = \'1\' );select COUNT(*) as total_ct, @total as total from coinflip where ticket > 50 and `finished` = \'1\';',
      function (s_error, s_results) {
        if (s_error) {
          Log.error(s_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        const ct_percentage = parseFloat(((s_results[1][0].total_ct / s_results[1][0].total) * 100).toFixed(2));
        const t_percentage = parseFloat((100 - ct_percentage).toFixed(2));
        const games = [];
        forEachAsync(results, function (next, game) {
          MySQL_Pool.query('SELECT * FROM users Where id = ' + game.player1_id, function (player_error, player_results) {
            if (player_error) {
              Log.error(player_error);
              res.status(500).json({success: false, error: 'Something went wrong'});
              return;
            }
            games.push({
              'id': game.game_uuid,
              'amount': game.amount,
              'player1': {
                'name': player_results[0].nickname,
                'avatar': player_results[0].avatar,
                'side': game.player1_side
              },
              'player2': null,
              'hash': game.hash,
              'expires_at': game.expires_at
            });
            next();
          });
        }).then(function () {
          console.log('All requests have finished');
          res.json({
            'ct_percentage': ct_percentage,
            't_percentage': t_percentage,
            'games': games
          });
        });
      });
  });

}

function Create_Game(req, res) {
  payload(req, function (body) {
    connect_Logger.info(req.headers.steamid64 + ' ' + body);
    body = JSON.parse(body);
    if (!_.isNumber(body.amount)) {
      res.status(406).json({success: false, error: 'Insufficient funds'});
      return;
    }
    if (parseFloat(body.amount) < 0.50) {
      res.status(406).json({success: false, error: 'Minimum bet is 0.50'});
      return;
    }
    if (body.side !== 'counter-terrorist' && body.side !== 'terrorist') {
      res.status(406).json({success: false, error: 'Wrong side'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (error, results) {
      if (error) {
        Log.error(error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      if (results[0].balance < body.amount) {
        res.status(406).json({success: false, error: 'Insufficient funds'});
        return;
      }
      const game_uuid = uuid_v5(req.headers.steamid64, uuid_v1());
      const expires_at = (Math.floor(Date.now() / 1000) + 3600);
      const salt = new Buffer(crypto.randomBytes(16).toString('base64')).toString('base64');
      const ticket = Math.random() * 100;
      const hash = crypto.createHash('sha256').update(salt + ':' + ticket).digest('hex');
      MySQL_Pool.query('UPDATE users SET balance = balance - ? , total_bet = total_bet + ? Where steamid = ?', [body.amount, body.amount, req.headers.steamid64], function (u_error) {
        if (u_error) {
          Log.error(u_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        MySQL_Pool.query('INSERT INTO `coinflip` (`game_uuid`, `amount`, `hash`, `salt`, `ticket`, `player1_id`, `player1_side`, `expires_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [game_uuid, body.amount, hash, salt, ticket, results[0].id, body.side, expires_at],
          function (c_error, c_results) {
            if (c_error) {
              Log.error(c_error);
              res.status(500).json({success: false, error: 'Something went wrong'});
              return;
            }

            res.status(200).json({success: true, error: null, game_id: game_uuid});
            setTimeout(() => {
              cancel_game(c_results.insertId);
            }, 1800000);
            io.emit('new_game', {
              'id': game_uuid,
              'amount': body.amount,
              'player1': {
                'name': results[0].nickname,
                'avatar': results[0].avatar,
                'side': body.side
              },
              'player2': null,
              'hash': hash,
              'expires_at': expires_at
            });
          }
        );
      });

    });
  });
}
function cancel_game(game_id: number) {
  MySQL_Pool.query('SELECT * FROM coinflip Where id = ?', [game_id], function (g_error, g_results) {
    if (g_error) {
      Log.error(g_error);
      return;
    }
    if (g_results.length <= 0) {
      return;
    }
    if (g_results[0].finished === 1) {
      return;
    }
    if (g_results[0].player2_id != null) {
      return;
    }
    MySQL_Pool.query('UPDATE coinflip SET finished = 2 Where id = ?', [game_id],
      function (c_error) {
        if (c_error) {
          Log.error(c_error);
          return;
        }
        io.emit('game_expire', {
          game_id: g_results[0].game_uuid
        });
        MySQL_Pool.query('UPDATE users SET balance = balance + ? , total_bet = total_bet - ? Where id = ?', [g_results[0].amount, g_results[0].amount, g_results[0].player1_id], function (b_error) {
          if (b_error) {
            Log.error(b_error);
            return;
          }
        });
      });
  });
}
function Join_Game(req, res) {
  payload(req, function (body) {
    connect_Logger.info(req.headers.steamid64 + ' ' + body);
    body = JSON.parse(body);
    if (!_.isString(body.game_id)) {
      res.status(406).json({success: false, error: 'Wrong Game'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM coinflip Where game_uuid = ?', [body.game_id], function (g_error, g_results) {
      if (g_error) {
        Log.error(g_error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      if (g_results.length <= 0) {
        res.status(406).json({success: false, error: 'Wrong Game'});
        return;
      }
      if (g_results[0].finished === 1) {
        res.status(406).json({success: false, error: 'Another has player joined this game'});
        return;
      }
      if (g_results[0].finished === 2) {
        res.status(406).json({success: false, error: 'This game has been expired'});
        return;
      }
      if (g_results[0].player2_id != null) {
        res.status(406).json({success: false, error: 'Another has player joined this game'});
        return;
      }
      MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (u_error, u_results) {
        if (u_error) {
          Log.error(u_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        if (g_results[0].player1_id === u_results[0].id) {
          res.status(406).json({success: false, error: 'You can not join your own game'});
          return;
        }
        if (u_results[0].balance < g_results[0].amount) {
          res.status(406).json({success: false, error: 'Insufficient funds'});
          return;
        }
        MySQL_Pool.query('UPDATE users SET balance = balance - ? , total_bet = total_bet + ? Where id = ?', [g_results[0].amount, g_results[0].amount, u_results[0].id], function (b_error) {
          if (b_error) {
            Log.error(b_error);
            res.status(500).json({success: false, error: 'Something went wrong'});
            return;
          }
          const winner_side = g_results[0].ticket < 50 ? 'terrorist' : 'counter-terrorist';
          const player2_side = g_results[0].player1_side === 'counter-terrorist' ? 'terrorist' : 'counter-terrorist';
          const winner_id = winner_side === player2_side ? u_results[0].id : g_results[0].player1_id;
          MySQL_Pool.query('UPDATE coinflip SET finished = 1, player2_id = ?, player2_side = ?, winner_side = ?,winner_id = ? Where game_uuid = ?', [u_results[0].id, player2_side, winner_side, winner_id, body.game_id],
            function (c_error) {
              if (c_error) {
                Log.error(c_error);
                res.status(500).json({success: false, error: 'Something went wrong'});
                return;
              }
              const winning = g_results[0].amount * (2 - house_edg);
              MySQL_Pool.query('UPDATE users SET balance = balance + ?, total_win = total_win + ? Where id = ?', [winning, winning, winner_id], function (w_error) {
                if (w_error) {
                  Log.error(w_error);
                  res.status(500).json({success: false, error: 'Something went wrong'});
                  return;
                }
                MySQL_Pool.query('SELECT * FROM users Where id = ?', [winner_id], function (wu_error, wu_results) {
                  if (wu_error) {
                    Log.error(wu_error);
                    res.status(500).json({success: false, error: 'Something went wrong'});
                    return;
                  }
                  res.status(200).json({success: true, error: null});
                  io.emit('game_update', {
                    game_id: g_results[0].game_uuid,
                    player2: {
                      'name': u_results[0].nickname,
                      'avatar': u_results[0].avatar,
                      'side': u_results[0].side
                    }
                  });
                  io.emit('game_start_' + g_results[0].id, {
                    game_id: g_results[0].id,
                    player2: {
                      'name': u_results[0].nickname,
                      'avatar': u_results[0].avatar,
                      'side': u_results[0].side
                    },
                    winner: {
                      name: wu_results[0].nickname,
                      steamid64: wu_results[0].steamid,
                      side: winner_side.replace('counter-', 'c').replace('terrorist', 't'),
                      amount: (g_results[0].amount * (2 - house_edg)).toFixed(2),
                      salt: g_results[0].salt,
                      number: g_results[0].ticket
                    }
                  });
                  if (sockets[wu_results[0].steamid] !== undefined) {
                    sockets[wu_results[0].steamid].emit('balance_add_coinflip', {balance: (g_results[0].amount * (2 - house_edg)).toFixed(2)});
                  }
                });
              });
            });
        });
      });
    });
  });
}

function Get_Game_Status(req, res) {
  if (!_.isString(req.params.game_id)) {
    res.status(406).json({success: false, error: 'Wrong Game'});
    return;
  }
  MySQL_Pool.query('SELECT * FROM coinflip Where game_uuid = ?', [req.params.game_id], function (g_error, g_results) {
    if (g_error) {
      Log.error(g_error);
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    if (g_results.length <= 0) {
      res.status(406).json({success: false, error: 'Wrong Game'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where id = ?', [g_results[0].player1_id], function (p1_error, p1_results) {
      if (p1_error) {
        Log.error(p1_error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      if (g_results[0].player2_id !== null) {
        MySQL_Pool.query('SELECT * FROM users Where id = ?', [g_results[0].player2_id], function (p2_error, p2_results) {
          if (p2_error) {
            Log.error(p2_error);
            res.status(500).json({success: false, error: 'Something went wrong'});
            return;
          }
          const winner_name = g_results[0].player1_side === g_results[0].winner_side ? p1_results[0].nickname : p2_results[0].nickname;
          const winner_steamid = g_results[0].player1_side === g_results[0].winner_side ? p1_results[0].steamid : p2_results[0].steamid;
          res.status(200).json({
            'game': {
              'id': g_results[0].id,
              'amount': g_results[0].amount,
              'player1': {
                'name': p1_results[0].nickname,
                'avatar': p1_results[0].avatar,
                'side': g_results[0].player1_side
              },
              'player2': {
                'name': p2_results[0].nickname,
                'avatar': p2_results[0].avatar,
                'side': g_results[0].player2_side
              },
              'hash': g_results[0].hash
            },
            'winner': {
              'name': winner_name,
              'steamid64': winner_steamid,
              'side': g_results[0].winner_side,
              'amount': (g_results[0].amount * (2 - house_edg)).toFixed(2),
              'salt': g_results[0].salt,
              'number': g_results[0].ticket
            }
          });
        });
      } else {
        res.status(200).json({
          'game': {
            'id': g_results[0].id,
            'amount': g_results[0].amount,
            'player1': {
              'name': p1_results[0].nickname,
              'avatar': p1_results[0].avatar,
              'side': g_results[0].player1_side
            },
            'player2': null,
            'hash': g_results[0].hash
          },
          'winner': null
        });
      }
    });
  });
}

function Get_Balance(req, res) {
  MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (u_error, u_results) {
    if (u_error) {
      Log.error(u_error);
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    res.status(200).json({success: true, error: null, balance: u_results[0].balance});
  });
}
function Get_Trade_Link(req, res) {
  MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (u_error, u_results) {
    if (u_error) {
      Log.error(u_error);
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM coinflip Where player1_id = ? or player2_id = ?  ORDER BY `id` DESC LIMIT 10', [u_results[0].id, u_results[0].id], function (g_error, g_results) {
      if (g_error) {
        Log.error(g_error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      const history = [];
      forEachAsync(g_results, function (next, game) {
        if (game.winner_id === u_results[0].id) {
          history.push({
            id: game.id,
            uuid: game.game_uuid,
            type: 'Coinflip',
            mode: 'Winning',
            amount: (game.amount * (2 - house_edg)).toFixed(2),
            date: game.created_at
          });
        }
        if (game.finished === 2) {
          history.push({
            id: game.id,
            uuid: game.game_uuid,
            type: 'Coinflip',
            mode: 'Expires',
            amount: (game.amount).toFixed(2),
            date: game.created_at
          });
        }
        if (game.player2_id === u_results[0].id) {
          history.push({
            id: game.id,
            uuid: game.game_uuid,
            type: 'Coinflip',
            mode: 'Join',
            amount: (game.amount).toFixed(2),
            date: game.created_at
          });
        } else {
          history.push({
            id: game.id,
            uuid: game.game_uuid,
            type: 'Coinflip',
            mode: 'Create',
            amount: (game.amount).toFixed(2),
            date: game.created_at
          });
        }
        next();
      }).then(function () {
        res.status(200).json({
          wager: u_results[0].total_bet,
          winnings: u_results[0].total_win,
          profit: (+u_results[0].total_win - +u_results[0].total_bet).toFixed(2),
          history: history,
          trade_link: u_results[0].trade_link
        });
      });
    });

  });
}

function Update_Trade_Link(req, res) {
  payload(req, function (body) {
    connect_Logger.info(req.headers.steamid64 + ' ' + body);
    body = JSON.parse(body);
    if (!_.isString(body.trade_link)) {
      res.status(406).json({success: false, error: 'Wrong Trade Link'});
      return;
    }
    const partner = convertor.to32(req.headers.steamid64);
    if (body.trade_link.indexOf('steamcommunity.com/tradeoffer/new/') !== -1 && body.trade_link.indexOf(partner) !== -1) {
      MySQL_Pool.query('UPDATE users SET trade_link = ? Where steamid = ?', [body.trade_link, req.headers.steamid64], function (g_error) {
        if (g_error) {
          Log.error(g_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        res.status(200).json({success: true, error: null});
      });
    } else {
      res.status(406).json({success: false, error: 'Wrong Trade Link'});
      return;
    }
  });
}

function Get_Withdraw_Items(req, res) {
  const inventory = {};
  MySQL_Pool.query('SELECT * FROM `shop_items` ORDER BY `current_value` DESC', [req.headers.steamid64], function (error, results) {
    if (error) {
      Log.error(error);
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    if (results.length !== 0) {
      forEachAsync(results, function (next, item) {
        inventory['item_' + item.asset_id] = {
          'name': item.name,
          'full_name': item.full_name,
          'exterior': item.exterior,
          'float': item.item_float,
          'nametag': item.item_nametag,
          'inspect_link': item.inspect_link,
          'image': item.image,
          'stickers': JSON.parse(item.stickers),
          'price': item.current_value
        };
        next();
      }).then(function () {
        res.json({items: inventory});
      });
    }
  });
}

function Withdraw_Items(req, res) {
  if (Cache_Service.get('Withdraw_Items_' + req.headers.steamid64) !== undefined) {
    res.status(406).json({success: false, error: 'You can refresh your inventory once every 5 minutes'});
    return;
  }
  Cache_Service.set('Withdraw_Items_' + req.headers.steamid64, 1, 300);
  payload(req, function (body) {
    body = JSON.parse(body);
    if (!_.isString(body.item)) {
      res.status(406).json({success: false, error: 'Invalid item id'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (u_error, u_results) {
      if (u_error) {
        Log.error(u_error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      const trade_link = u_results[0].trade_link;
      if (trade_link === null) {
        res.status(406).json({success: false, error: 'Please update your trade link'});
        return;
      }
      if (u_results[0].total_deposit < 5) {
        res.status(406).json({success: false, error: 'You must deposit 5.00 coins before you can use this feature'});
        return;
      }
      if (u_results[0].total_bet < u_results[0].total_deposit) {
        res.status(406).json({success: false, error: 'You must bet ' + (u_results[0].total_bet - u_results[0].total_deposit).toFixed(2) + ' more to withdraw this item' });
        return;
      }
      const token = trade_link.match(/token=([^&]*)/)[1];
      const partner = convertor.to32(req.headers.steamid64);
      const withdraw_code = makeid();
      const item_id = body.item;

      MySQL_Pool.query('SELECT * FROM offers Where user_id = ? and status = 1', [u_results[0].id], function (t_error, t_results) {
        if (t_error) {
          Log.error(t_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        if (t_results.length > 0) {
          res.status(406).json({success: false, error: 'Please complete your previous offers'});
          return;
        }
        let item_value = 0;
        const item_info = [];
        MySQL_Pool.query('SELECT * FROM shop_items Where asset_id = ?', [item_id], function (i_error, i_results) {
          if (i_error) {
            Log.error(i_error);
            res.status(500).json({success: false, error: 'Something went wrong'});
            return;
          }
          if (i_results.length < 0) {
            res.status(406).json({success: false, error: 'This item already withdrawn'});
            return;
          }
          item_value += +i_results[0].current_value;
          item_info.push({
            full_name: i_results[0].full_name,
            price: i_results[0].current_value
          });
          if (u_results[0].balance < item_value) {
            res.status(406).json({success: false, error: 'Insufficient funds'});
            return;
          }
          if (item_value > 49.99) {
            if (u_results[0].rank < 7) {
              res.status(500).json({success: false, error: 'Something went wrong'});
              return;
            }
          }
          bot_manager[1].bot.send_withdraw(partner, token, item_id, withdraw_code, function (id) {
            MySQL_Pool.query('INSERT INTO `offers` (`user_id`, `type`, `item_ids`, `items_info`, `value`, `deposit_code`, `trade_partner`, `trade_token`, `trade_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [u_results[0].id, 'withdraw', item_id, JSON.stringify(item_info), item_value, withdraw_code, partner, token, id],
              function (c_error) {
                if (c_error) {
                  Log.error(c_error);
                  res.status(500).json({success: false, error: 'Something went wrong'});
                  return;
                }
                MySQL_Pool.query('UPDATE users SET balance = balance - ? Where id = ?', [item_value, u_results[0].id], function (b_error) {
                  if (b_error) {
                    Log.error(b_error);
                    res.status(500).json({success: false, error: 'Something went wrong'});
                    return;
                  }
                });
              });
            res.status(200).json({
              success: true,
              offer_id: id,
              offer_code: withdraw_code,
              error: null
            });
          });
        });
      });
    });
  });
}

function get_price(item_name: string) {
  if (prices[item_name] !== undefined) {
    return prices[item_name];
  }
  return 0;
}

const searchdesc = function (classid, arr) {
  for (const key in arr) {
    if (arr.hasOwnProperty(key)) {
      if (classid === arr[key].classid) {
        return key;
      }
    }
  }
};

function Get_User_Items_Cache(req, res) {
  const inventory = {};
  MySQL_Pool.query('SELECT * FROM `users_inventories` WHERE `steamid64` = ? ORDER BY `current_value` DESC', [req.headers.steamid64], function (error, results) {
    if (results.length !== 0) {
      forEachAsync(results, function (next, item) {
        inventory['item_' + item.asset_id] = {
          'name': item.name,
          'full_name': item.full_name,
          'image': item.image,
          'price': item.current_value
        };
        next();
      }).then(function () {
        res.json({items: inventory});
      });
    } else {
      // update_inventory
      let items = [];
      requery('http://steamcommunity.com/inventory/' + req.headers.steamid64 + '/730/2?l=english&count=5000', function (body) {
        if (body === false) {
          res.status(406).json({success: false, error: 'Private inventory'});
          return;
        }
        try {
          const json_string = body;
          forEachAsync(json_string.assets, function (next, item_key) {
            const id = searchdesc(item_key.classid, json_string.descriptions);
            if (json_string.descriptions[id].tradable === 1) {
              const asset_id = parseFloat(item_key.assetid);
              const full_name = (json_string.descriptions[id].market_name);
              const name = (full_name.split('|').pop().split('(')[0]).replace(' Case Key', '');
              const market_hash_name = (json_string.descriptions[id].market_hash_name);
              const image = (json_string.descriptions[id].icon_url);
              const price = +(get_price(market_hash_name) * 1.10).toFixed(2);
              if (full_name.toLowerCase().indexOf('music') === -1 || full_name.toLowerCase().indexOf('sticker') === -1 || full_name.toLowerCase().indexOf('graffiti') === -1 || full_name.toLowerCase().indexOf('case') === -1) {
                if (price >= App_Config.min_deposit) {
                  items[items.length] = [req.headers.steamid64, asset_id, full_name, name, image, price];
                }
              }
            }
            next();
          }).then(function () {
            if (items.length > 0) {
              items = items.sort(function (first, second) {
                const a = first[5];
                const b = second[5];

                if (a > b) {
                  return -1;
                } else if (a < b) {
                  return 1;
                } else {
                  return 0;
                }
              });
              MySQL_Pool.query('INSERT INTO `users_inventories` (`steamid64`, `asset_id`, `full_name`, `name`, `image`, `current_value`) VALUES ?', [items], function (i_error) {
                if (i_error) {
                  Log.error(i_error);
                  res.status(500).json({success: false, error: 'Something went wrong'});
                  return;
                }
              });

              for (let i = 0; i < items.length; i++) {
                inventory['item_' + items[i][1]] = {
                  'name': items[i][3],
                  'full_name': items[i][2],
                  'image': items[i][4],
                  'price': items[i][5]
                };
              }
              res.json({items: inventory});
            }
          });
        } catch (err) {
          Log.error(err);
        }
      });
    }
  });
}

function Get_User_Items(req, res) {
  if (Cache_Service.get('Get_User_Items_' + req.headers.steamid64) !== undefined) {
    res.status(406).json({success: false, error: 'You can refresh your inventory once every 5 minutes'});
    return;
  }
  Cache_Service.set('Get_User_Items_' + req.headers.steamid64, 1, 300);
  const inventory = {};
  MySQL_Pool.query('DELETE FROM `users_inventories` WHERE `steamid64` = ?', [req.headers.steamid64], function (error, results) {
    if (!error) {
      // update_inventory
      let items = [];
      requery('http://steamcommunity.com/inventory/' + req.headers.steamid64 + '/730/2?l=english&count=5000', function (body) {
        if (body === false) {
          res.status(406).json({success: false, error: 'Private inventory'});
          return;
        }
        try {
          const json_string = body;
          forEachAsync(json_string.assets, function (next, item_key) {
            const id = searchdesc(item_key.classid, json_string.descriptions);
            if (json_string.descriptions[id].tradable === 1) {
              const asset_id = parseFloat(item_key.assetid);
              const full_name = (json_string.descriptions[id].market_name);
              const name = (full_name.split('|').pop().split('(')[0]).replace(' Case Key', '');
              const market_hash_name = (json_string.descriptions[id].market_hash_name);
              const image = (json_string.descriptions[id].icon_url);
              const price = +(get_price(market_hash_name) * 1.10).toFixed(2);
              if (full_name.toLowerCase().indexOf('music') === -1 || full_name.toLowerCase().indexOf('sticker') === -1 || full_name.toLowerCase().indexOf('graffiti') === -1 || full_name.toLowerCase().indexOf('case') === -1) {
                if (price >= App_Config.min_deposit) {
                  items[items.length] = [req.headers.steamid64, asset_id, full_name, name, image, price];
                }
              }
            }
            next();
          }).then(function () {
            if (items.length > 0) {
              items = items.sort(function (first, second) {
                const a = first[5];
                const b = second[5];

                if (a > b) {
                  return -1;
                } else if (a < b) {
                  return 1;
                } else {
                  return 0;
                }
              });
              MySQL_Pool.query('INSERT INTO `users_inventories` (`steamid64`, `asset_id`, `full_name`, `name`, `image`, `current_value`) VALUES ?', [items], function (i_error) {
                if (i_error) {
                  Log.error(i_error);
                  res.status(500).json({success: false, error: 'Something went wrong'});
                  return;
                }
              });

              for (let i = 0; i < items.length; i++) {
                inventory['item_' + items[i][1]] = {
                  'name': items[i][3],
                  'full_name': items[i][2],
                  'image': items[i][4],
                  'price': items[i][5]
                };
              }
              res.json({items: inventory});
            }else {
              res.status(406).json({success: false, error: 'No items found'});
              return;
            }
          });
        } catch (err) {
          Log.error(err);
        }
      });
    }
  });
}

function Deposit_Items(req, res) {
  payload(req, function (body) {
    connect_Logger.info(req.headers.steamid64 + ' ' + body);
    body = JSON.parse(body);
    if (!_.isArray(body.items)) {
      res.status(406).json({success: false, error: 'Invalid items'});
      return;
    }
    const items_array = _.sortedUniq(body.items);
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (u_error, u_results) {
      if (u_error) {
        Log.error(u_error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      const trade_link = u_results[0].trade_link;
      if (trade_link === null) {
        res.status(406).json({success: false, error: 'Please update your trade link'});
        return;
      }
      const token = trade_link.match(/token=([^&]*)/)[1];
      const partner = convertor.to32(req.headers.steamid64);
      const deposit_code = makeid();

      MySQL_Pool.query('SELECT * FROM offers Where user_id = ? and status = 1', [u_results[0].id], function (t_error, t_results) {
        if (t_error) {
          Log.error(t_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        if (t_results.length > 0) {
          res.status(406).json({success: false, error: 'Please complete your previous offers'});
          return;
        }
        let items_value = 0;
        const items_info = [];
        forEachAsync(items_array, function (next, item_asset_id) {
          MySQL_Pool.query('SELECT  * FROM `users_inventories` WHERE `asset_id` = ?', [item_asset_id], function (ui_error, ui_results) {
            if (ui_error) {
              Log.error(ui_error);
              res.status(500).json({success: false, error: 'Something went wrong'});
              return;
            }
            items_value += +ui_results[0].current_value;
            items_info.push({
              full_name: ui_results[0].full_name,
              price: ui_results[0].current_value
            });
            next();
          });
        }).then(function () {
          bot_manager[1].bot.send_deposit(partner, token, items_array, deposit_code, function (id) {
            MySQL_Pool.query('INSERT INTO `offers` (`user_id`, `type`, `item_ids`, `items_info`, `value`, `deposit_code`, `trade_partner`, `trade_token`, `trade_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [u_results[0].id, 'deposit', items_array.join(','), JSON.stringify(items_info), items_value, deposit_code, partner, token, id],
            function (c_error) {
              if (c_error) {
                Log.error(c_error);
                res.status(500).json({success: false, error: 'Something went wrong'});
                return;
              }
                res.status(200).json({
                  success: true,
                  offer_id: id,
                  offer_code: deposit_code,
                  error: null
                });
              });
            });
        });
      });
    });
  });
}

function Affiliates(req, res) {
  MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (u_error, u_results) {
    if (u_error) {
      Log.error(u_error);
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    const redeemed = u_results[0].redeemed;
    const affiliate_code = u_results[0].user_code;
    const total_earnings = u_results[0].aff_balance;
    MySQL_Pool.query('SELECT count(*) AS aff_count FROM users Where redeemed_id = ?', [u_results[0].id], function (au_error, au_results) {
      if (au_error) {
        Log.error(au_error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      const total_affiliates = au_results[0].aff_count;
      const rank = Math.floor(total_affiliates / 100);
      res.status(200).json({
        redeemed: redeemed,
        current_rank: rank,
        affiliate_code: affiliate_code,
        total_earnings: total_earnings,
        total_affiliates: ((total_affiliates / ((rank + 1) * 100)) * 100) + '%'
      });
    });
  });
}

function Redeem_Affiliate(req, res) {
  payload(req, function (body) {
    connect_Logger.info(req.headers.steamid64 + ' ' + body);
    body = JSON.parse(body);
    if (!_.isString(body.code)) {
      res.status(403).json({success: false, error: 'you have entered an invalid affiliate code'});
      return;
    }
    if (body.code === null) {
      res.status(403).json({success: false, error: 'you have entered an invalid affiliate code'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (u_error, u_results) {
      if (u_error) {
        Log.error(u_error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      const redeemed = u_results[0].redeemed;
      if (redeemed) {
        res.status(403).json({success: false, error: 'You can redeem the affiliate code only once'});
        return;
      }
      if (u_results[0].user_code.toLowerCase() === body.code.toLowerCase()) {
        res.status(403).json({success: false, error: 'You can not redeem your own code'});
        return;
      }
      MySQL_Pool.query('SELECT * FROM users Where user_code = ?', [body.code], function (c_error, c_results) {
        if (c_error) {
          Log.error(c_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        if (c_results.length < 1) {
          res.status(403).json({success: false, error: 'This affiliate code not exist'});
          return;
        }
        if (!verify(req.headers.steamid64)) {
          res.status(403).json({success: false, error: 'You do not own csgo'});
          return;
        }
        MySQL_Pool.query('SELECT count(*) AS aff_count FROM users Where redeemed_id = ?', [c_results[0].id], function (au_error, au_results) {
          if (au_error) {
            Log.error(au_error);
            res.status(500).json({success: false, error: 'Something went wrong'});
            return;
          }
          const total_affiliates = au_results[0].aff_count;
          const affiliates_level = Math.floor(total_affiliates / 100);
          const bonus_give = (affiliates_level * 0.05) + 0.35;
          const bonus_get = (affiliates_level * 0.01) + 0.05;
          MySQL_Pool.query('UPDATE users SET balance = balance + ?, redeemed = 1, redeemed_code = ?, redeemed_id = ? Where steamid = ?', [bonus_give, body.code, c_results[0].id, req.headers.steamid64], function (b_error) {
            if (b_error) {
              Log.error(b_error);
              res.status(500).json({success: false, error: 'Something went wrong'});
              return;
            }
            MySQL_Pool.query('UPDATE users SET balance = balance + ?, aff_balance = aff_balance + ? Where id = ?', [bonus_get, bonus_get, c_results[0].id], function (b2_error) {
              if (b2_error) {
                Log.error(b2_error);
                res.status(500).json({success: false, error: 'Something went wrong'});
                return;
              }
              res.status(200).json({success: true, amount: bonus_give});
            });
          });
        });
      });
    });
  });
}

function Change_Affiliate_Code(req, res) {
  payload(req, function (body) {
    connect_Logger.info(req.headers.steamid64 + ' ' + body);
    body = JSON.parse(body);
    if (!_.isString(body.code)) {
      res.status(403).json({success: false, error: 'you have entered an invalid affiliate code'});
      return;
    }
    if (body.code === null) {
      res.status(403).json({success: false, error: 'you have entered an invalid affiliate code'});
      return;
    }
    if (body.code.length > 6) {
      res.status(403).json({success: false, error: 'The maximum length of the affiliate code is 6 characters'});
      return;
    }
    if (body.code.length < 3) {
      res.status(403).json({success: false, error: 'The minimum length of the affiliate code is 3 characters'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where user_code = ?', [body.code.toLowerCase()], function (c_error, c_results) {
      if (c_error) {
        Log.error(c_error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      if (c_results.length > 0) {
        res.status(403).json({success: false, error: 'This affiliate code is already being used by a different user'});
        return;
      }
      MySQL_Pool.query('UPDATE users SET user_code = ? Where steamid = ?', [body.code.toLowerCase(), req.headers.steamid64], function (b2_error) {
        if (b2_error) {
          Log.error(b2_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        res.status(200).json({success: true, error: null, code: body.code});
      });
    });
  });
}

function get_float(inspect_link, retrys, callback) {
  console.log(inspect_link + '-' + retrys);
  bot_manager[1].bot.get_float_nametag(inspect_link, retrys, function (float) {
    if (float !== false) {
      callback(float);
    } else {
      retrys++;
      get_float(inspect_link, retrys, callback);
    }
  });
}

function update_bot_shop(botid: number, bot_steamid64: string) {
  Log.info('Updateting Bot #' + botid + ' Shop');
  let items = [];
  requery('http://steamcommunity.com/inventory/' + bot_steamid64 + '/730/2?l=english&count=5000', function (body) {
    Log.info('Query Bot #' + botid + ' Items Done');
    if (body === false) {
      // console.log(body);
      return;
    }
    try {
      const json_string = body;
      forEachAsync(json_string.assets, function (next, item_key) {
        // console.log(item_key);
        const id = searchdesc(item_key.classid, json_string.descriptions);
        if (json_string.descriptions[id].tradable === 1) {
          const asset_id = parseFloat(item_key.assetid);
          const full_name = (json_string.descriptions[id].market_name);
          const name = (full_name.split('|').pop().split('(')[0]).replace(' Case Key', '');
          const market_hash_name = (json_string.descriptions[id].market_hash_name);
          const image = (json_string.descriptions[id].icon_url);
          const price = +(get_price(market_hash_name) * 1.15).toFixed(2);
          const inspect_link = json_string.descriptions[id].actions !== undefined ? json_string.descriptions[id].actions[0].link.replace('%owner_steamid%', bot_steamid64).replace('%assetid%', asset_id) : null;
          const item_des = json_string.descriptions[id];
          const stickers = [];
          if (item_des['descriptions'] !== undefined) {
            if (item_des['descriptions'][item_des['descriptions'].length - 1]['value'].indexOf('akamaihd.net') !== -1) {
              const regex = /src="(.*?)"/g;
              const str = item_des['descriptions'][item_des['descriptions'].length - 1]['value'];
              let m;
              while ((m = regex.exec(str)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                  regex.lastIndex++;
                }
                // The result can be accessed through the `m`-variable.
                m.forEach((match, groupIndex) => {
                  if (groupIndex !== 0) {
                    stickers[stickers.length] = {sticker_image: match};
                  }
                });
              }
              if (stickers.length > 0) {
                const sticker_names = str.replace('Sticker: ', '').match(/><br>(.*?)<\/center>/)[1].split(', ');
                for (let i = 0; i < (sticker_names.length > 4 ? 4 : sticker_names.length); i++) {
                  if (stickers[i] !== undefined && stickers[i] !== null) {
                    stickers[i]['sticker_name'] = sticker_names[i];
                  }
                }
              }
            }
          }
          if (full_name.toLowerCase().indexOf('music') === -1 && full_name.toLowerCase().indexOf('sticker') === -1 && full_name.toLowerCase().indexOf('graffiti') === -1 && full_name.toLowerCase().indexOf('case') === -1) {
            const exterior = full_name.toLowerCase().indexOf('case key') === -1 ? (full_name.match(/\(([^)]+)\)/) !== null ? full_name.match(/\(([^)]+)\)/)[1] : null) : null;
            const nametag = item_des['fraudwarnings'] !== undefined ? item_des['fraudwarnings'][0].match(/Name Tag: \'\'(.*)\'\'/)[1] : null;
            get_float(inspect_link, 0, function (float) {
              items[items.length] = [bot_steamid64, asset_id, full_name, name, image, price, inspect_link, exterior, JSON.stringify(stickers), float, nametag];
              setTimeout(() => {
                next();
              }, 1000);
            });
          } else {
            next();
          }
        }
      }).then(function () {
        if (items.length > 0) {
          items = items.sort(function (first, second) {
            const a = first[5];
            const b = second[5];

            if (a > b) {
              return -1;
            } else if (a < b) {
              return 1;
            } else {
              return 0;
            }
          });
          MySQL_Pool.query('DELETE FROM `shop_items` WHERE steamid64 = ?', [bot_steamid64], function (d_error) {
            if (d_error) {
              Log.error(d_error);
              return;
            }
            MySQL_Pool.query('INSERT INTO `shop_items` (`steamid64`, `asset_id`, `full_name`, `name`, `image`, `current_value`, `inspect_link`, `exterior`, `stickers`, `item_float`, `item_nametag`) VALUES ?', [items], function (i_error) {
              if (i_error) {
                Log.error(i_error);
                return;
              }
            });
          });
        }
        setTimeout(() => {
          for (let bot_id = 0; bot_id < App_Config.bots.length; bot_id++) {
            update_bot_shop(bot_id, '76561198324547183');
          }
        }, 300000);
      });
    } catch (err) {
      Log.error(err);
      setTimeout(() => {
        for (let bot_id = 0; bot_id < App_Config.bots.length; bot_id++) {
          update_bot_shop(bot_id, '76561198324547183');
        }
      }, 300000);
    }
  });
}

function requery(query, callback) {
  got(query)
    .then(response => {
      callback(JSON.parse(response.body));
    })
    .catch(error => {
      if (error.statusCode === 403) {
        callback(false);
        return;
      }
      Log.error(error);
      setTimeout(() => requery(query, callback), 5000);
    });
}

function makeid() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function Join_Roulette_Round(req, res) {
  if (!roll_join) {
    res.status(403).json({success: false, error: 'The drawing has begun'});
    return;
  }
  payload(req, function (body) {
    connect_Logger.info(req.headers.steamid64 + ' ' + body);
    body = JSON.parse(body);
    if (!_.isNumber(body.amount)) {
      res.status(406).json({success: false, error: 'Insufficient funds'});
      return;
    }
    if (body.amount < 0.01) {
      res.status(406).json({success: false, error: 'Insufficient funds'});
      return;
    }
    if (!_.isString(req.params.side)) {
      res.status(403).json({success: false, error: 'The maximum length of the affiliate code is 6 characters'});
      return;
    }
    if (['t', 'wild', 'ct'].indexOf(req.params.side) === -1) {
      res.status(406).json({success: false, error: 'Wrong Side'});
      return;
    }
    MySQL_Pool.query('SELECT * FROM users Where steamid = ?', [req.headers.steamid64], function (error, results) {
      if (error) {
        Log.error(error);
        res.status(500).json({success: false, error: 'Something went wrong'});
        return;
      }
      if (results[0].balance < body.amount) {
        res.status(406).json({success: false, error: 'Insufficient funds'});
        return;
      }
      MySQL_Pool.query('UPDATE users SET balance = balance - ? , total_bet = total_bet + ? Where steamid = ?', [body.amount, body.amount, req.headers.steamid64], function (u_error) {
        if (u_error) {
          Log.error(u_error);
          res.status(500).json({success: false, error: 'Something went wrong'});
          return;
        }
        res.status(200).json({success: true, error: null});
        const bet = {
          player: {
            id: results[0].id,
            steamid64: req.headers.steamid64,
            name: results[0].nickname,
            avatar: results[0].avatar
          },
          amount: body.amount,
        };
        _bets[req.params.side].push(bet);
        _totals[req.params.side] += body.amount;
        io.emit('roulette_new_bet', {
          side: req.params.side,
          bet: bet
        });
      });
    });
  });
}

function Get_Roulette_Status(req, res) {
  MySQL_Pool.query('SELECT * FROM `roulette_rolls` ORDER BY `id` DESC LIMIT 16', [], function (g_error, g_results) {
    if (g_error) {
      Log.error(g_error);
      res.status(500).json({success: false, error: 'Something went wrong'});
      return;
    }
    const history = [];
    forEachAsync(g_results, function (next, round) {
      history.unshift({
        roll_id: round.id,
        roll_hash: round.hash,
        roll_salt: round.salt,
        roll_number: round.number
      });
      next();
    }).then(function () {
      res.status(200).json({
        history: history,
        round_time: roll_timer,
        bets: _bets,
        totals: _totals,
        round_hash: next_round.hash
      });
    });

  });
}

function roll() {
  if (roll_timer <= 0) {
    roulette_Logger.debug('Roulette Roll Started');
    const round = next_round;
    MySQL_Pool.query('INSERT INTO `roulette_rolls` (`hash`, `salt`, `number`) VALUES (?, ?, ?)', [round.hash, round.salt, round.ticket], function (r_error, r_results) {
      if (r_error) {
        Log.error(r_error);
        return;
      }
      roulette_Logger.debug('Roulette #%i Rolled', r_results.insertId, round.ticket);
      io.emit('roulette_start', {
        'round_data': {
          'roll_id': r_results.insertId,
          'roll_hash': round.hash,
          'roll_salt': round.salt,
          'roll_number': round.ticket
        },
        'diff': Math.random()
      });
      let payout = 14;
      let winners = _bets.wild;
      if (round.ticket < 46.67) {
        payout = 2;
        winners = _bets.t;
      } else if (round.ticket > 53.33) {
        payout = 2;
        winners = _bets.ct;
      }
      give_prizes(winners, payout);
    });
  }
}

function give_prizes(winners, payout) {
  roulette_Logger.debug('Roulette Giving prizes to winners');
  forEachAsync(winners, function (next, bet) {
    MySQL_Pool.query('UPDATE users SET balance = balance + ?, total_win = total_win + ? Where id = ?', [bet.amount * payout, bet.amount * payout, bet.player.id], function (w_error) {
      if (w_error) {
        Log.error(w_error);
        return;
      }
      if (sockets[bet.player.steamid64] !== undefined) {
        sockets[bet.player.steamid64].emit('balance_add', {balance: (bet.amount * payout).toFixed(2)});
      }
      next();
    });
  }).then(function () {
    const salt = new Buffer(crypto.randomBytes(16).toString('base64')).toString('base64');
    const ticket = Math.random() * 100;
    const hash = crypto.createHash('sha256').update(salt + ':' + ticket).digest('hex');
    next_round.hash = hash;
    next_round.salt = salt;
    next_round.ticket = ticket;
    roll_timer = 28;
    roll_started = false;
    _bets.t = [];
    _bets.wild = [];
    _bets.ct = [];
    _totals.t = 0;
    _totals.wild = 0;
    _totals.ct = 0;
    setTimeout(() => {
      roll_join = true;
      roulette_Logger.debug('Roulette Roll count started');
      io.emit('roulette_new_round', {
        'round_time': 18,
        'round_hash': hash
      });
    }, 10000);
  });
}
function check_trades() {
  try {
    MySQL_Pool.query('SELECT * FROM `offers` WHERE `status` = 0', function (err, offers) {
      if (err) {
        Log.error(err);
        return;
      }
      forEachAsync(offers, function (next, offer) {
        bot_manager[1].bot.get_offer(offer.trade_id, function (state) {
          if (!state) {
            return;
          }
          if (state === 2) {
            next();
          }else if (state === 4) {
            MySQL_Pool.query('UPDATE `offers` SET status = 3 WHERE id = ?', [offer.id], function (err2) {
              if (err2) {
                Log.error(err2);
                next();
              }
              if (offer.type === 'withdraw') {
                MySQL_Pool.query('UPDATE users SET balance = balance + ? Where id = ?', [offer.value, offer.user_id], function (err3) {
                  if (err3) {
                    Log.error(err3);
                    next();
                  }
                  next();
                });
              } else {
                next();
              }
            });
          }else if (state === 3) {
            MySQL_Pool.query('UPDATE `offers` SET status = 1 WHERE id = ?', [offer.id], function (err2) {
              if (err2) {
                Log.error(err2);
                next();
              }
              if (offer.type === 'deposit') {
              MySQL_Pool.query('UPDATE users SET balance = balance + ? Where id = ?', [offer.value, offer.user_id], function (err3) {
                if (err3) {
                  Log.error(err3);
                  next();
                }
                next();
              });
              } else {
                next();
              }
            });
          } else {
            MySQL_Pool.query('UPDATE `offers` SET status = 2 WHERE id = ?', [offer.id], function (err2) {
              if (err2) {
                Log.error(err2);
                next();
              }
              if (offer.type === 'withdraw') {
                MySQL_Pool.query('UPDATE users SET balance = balance + ? Where id = ?', [offer.value, offer.user_id], function (err3) {
                  if (err3) {
                    Log.error(err3);
                    next();
                  }
                  next();
                });
              } else {
                next();
              }
            });
          }
        });
      }).then(function () {
        setTimeout(check_trades, 5000);
      });
    });
  } catch (err) {
    Log.error(err);
    setTimeout(check_trades, 5000);
  }
}
function verify(Steamid64) {
  requery('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=&steamid=' + Steamid64 + '&format=json', function (body) {
    const json_string = body;
    if (json_string.response.games) {
      let own_csgo = false;
      forEachAsync(json_string.response.games, function (next, game) {
        if(game.appid === 730) {
          own_csgo = true;
        }
        next();
      }).then(function () {
        return own_csgo;
      });
    }else {
      return false;
    }
  });
}

