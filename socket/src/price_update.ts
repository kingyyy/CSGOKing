import { MySQL_Pool } from './pool';
import * as fs from 'fs';
const contents = fs.readFileSync('./prices.json').toString();
// Define to JSON type
let jsonContent = [];
 jsonContent = JSON.parse(contents);
 const prices = [];
for (let i = 0; i < Object.keys(jsonContent).length; i++) {
  prices[prices.length] = [Object.keys(jsonContent)[i], jsonContent[Object.keys(jsonContent)[i]]];
}
MySQL_Pool.query('INSERT INTO `prices` (`name`, `price`) VALUES ?', [prices], function (err3, results3) {
  if (err3) {
    console.log(err3);
    return;
  }
  console.log('price updated');
});
