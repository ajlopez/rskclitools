const rskapi = require('rskapi');
const configs = require('../config');
const utils = require('../utils');
const simpleargs = require('simpleargs');
const simpleabi = require('simpleabi');

let config;
let client;

simpleargs.define('g','gas',0,'Gas');
simpleargs.define('gp','gasPrice',0,'Gas Price');
simpleargs.define('v','value',0,'Value');
simpleargs.define('l','log',false,'Log', { flag: true });

function getConfig() {
    if (config)
        return config;
    
    config = configs.loadConfiguration();
    
    return config;
}

function getClient() {
    if (client)
        return client;
    
    client = rskapi.client(getConfig().host);
    
    return client;
}

function useClient(newclient) {
    client = newclient;
}

async function execute(args, opts) {
    opts = opts || {};
    config = configs.loadConfiguration();
    client = getClient();
    
    args = simpleargs(args);
    
    if (args.log)
        client.host().provider().setLog(true);

    const from = utils.getAddress(config, args._[0]);
    const to = utils.getAddress(config, args._[1]);
    const fn = args._[2];
    let iargs;
    let otypes;
    
    if (fn.indexOf('()') >= 0) {
        iargs = [];
        otypes = args._[3];
    }
    else {
        iargs = utils.getArguments(config, args._[3]);
        otypes = args._[4];
    }
    
    const options = utils.getTransactionOptions(args, config);
    
    let result = await client.call(
        from,
        to,
        fn,
        iargs,
        options
    );
    
    if (otypes) 
        result = simpleabi.decodeValues(result, utils.getTypes(otypes));
    else if (result && result.length === 32 * 2 + 2)
        result = utils.getValue(result);

    if (opts.verbose)
        if (result instanceof Buffer)
            console.log('0x' + result.toString('hex'));
        else
            console.log(result);
    
    return result;
}

module.exports = {
    useClient,
    execute
};

