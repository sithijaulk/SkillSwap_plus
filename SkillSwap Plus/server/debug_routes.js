const app = require('./src/app');
const listEndpoints = require('express-list-endpoints');

console.log(JSON.stringify(listEndpoints(app), null, 2));
