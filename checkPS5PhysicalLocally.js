const fs = require('fs');
const yaml = require('yaml');
const handler = require('./handler');

const hooks = yaml.parse(fs.readFileSync('./hooks.yml', 'utf8'));
const config = yaml.parse(fs.readFileSync('./config.yml', 'utf8'));

process.env.slackEndpoint = hooks.ps5SlackEndpoint;
process.env.itemNumber = config.ps5PhysicalItemNumber;
process.env.mentions = config.ps5PhysicalMentions;

setInterval(handler.checkStock, 35000);
