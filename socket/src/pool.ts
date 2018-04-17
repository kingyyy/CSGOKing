import * as mysql from 'mysql';

const Pool = mysql.createPool({
  connectionLimit   : 100,
  host              : 'localhost',
  user              : 'root',
  password          : '12345',
  database          : 'CSGOKing',
  queueLimit        : 0,
  multipleStatements: true
});

Pool.on('connection', function(connection) {
  console.log('Connection established');

  connection.on('error', function(err) {
    console.error(new Date(), 'MySQL error', err.code);
  });
  connection.on('close', function(err) {
    console.error(new Date(), 'MySQL close', err);
  });
});

export const MySQL_Pool = Pool;
