const fs = require('fs');
const yaml = require('yaml');
const handler = require('./handler');

const hooks = yaml.parse(fs.readFileSync('./hooks.yml', 'utf8'));
const config = yaml.parse(fs.readFileSync('./config.yml', 'utf8'));

process.env.slackEndpoint = hooks.dumbbellSlackEndpoint;
process.env.itemNumber = config.dumbbellItemNumber;
process.env.mentions = config.dumbbellMentions;

setInterval(handler.checkStock, 30000);
