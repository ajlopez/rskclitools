
const BN = require('bn.js');
const fs = require('fs');
const path = require('path');

const maxdecdigits = Number.MAX_SAFE_INTEGER.toString(10).length;
const maxhexadigits = Number.MAX_SAFE_INTEGER.toString(16).length;

const hosts = {
    ganache: 'http://localhost:8545',
    truffle: 'http://localhost:8545',
    hardhat: 'http://localhost:8545',
    regtest: 'http://localhost:4444',
    local: 'http://localhost:4444',
    testnet: 'https://public-node.testnet.rsk.co:443',
    mainnet: 'https://public-node.rsk.co:443'
}

function getHost(name) {
    if (hosts[name])
        return hosts[name];
        
    return name;
}

function getHexadecimalValue(value) {
    while (value[0] === '0' && value.length > 1)
        value = value.substring(1);
    
    if (value.length >= maxhexadigits)
        return new BN(value, 16).toString();
    
    return parseInt(value, 16);
}

function getValue(value) {
    if (typeof value !== 'string')
        return value;
    
    if (value.startsWith('0x') && value.length > 2 + 32 * 2)
        return value;
    
    if (!value.startsWith('0x') && value.length > 32 * 2)
        return value;
    
    if (value.startsWith('0x'))
        return getHexadecimalValue(value.substring(2));
    
    while (value[0] === '0' && value.length > 1)
        value = value.substring(1);
    
    if (value.length >= maxdecdigits)
        return value;
    
    return parseInt(value);
}

function getAddress(config, name) {
    if (name.startsWith('0x'))
        return name;
    
    if (config.accounts && config.accounts[name])
        if (config.accounts[name].address)
            return config.accounts[name].address;
        else
            return config.accounts[name];
    
    if (config.instances && config.instances[name])
        if (config.instances[name].address)
            return config.instances[name].address;
        else
            return config.instances[name];
    
    return null;
}

function getAccount(config, name) {
    if (!config.accounts || !config.accounts[name])
        return null;
    
    return config.accounts[name];
}

function isZeroString(value) {
    for (let k = 0; k < value.length; k++)
        if (value[k] !== '0')
            return false;
        
    return true;
}

function removeRightZeros(value) {
    while (value[value.length - 1] === '0')
        value = value.substring(0, value.length - 1);
    
    if (value[value.length - 1] === '.')
        value = value.substring(0, value.length - 1);
    
    return value;
}

function withDecimals(value, decimals) {
    value = getValue(value).toString();
    
    if (isZeroString(value))
        return '0';
    
    if (decimals === 0)
        return value;
    
    while (value.length < decimals)
        value = '0' + value;
    
    if (value.length === decimals)
        return removeRightZeros('0.' + value);
    
    return removeRightZeros(value.substring(0, value.length - decimals) + '.' + value.substring(value.length - decimals));
}

function isDigit(ch) {
    return ch >= '0' && ch <= '9';
}

function getArgument(config, arg) {
    if (typeof arg !== 'string')
        return arg;
    
    if (isDigit(arg[0]))
        return arg;
    
    if (arg[0] === '"' && arg[arg.length - 1] === '"')
        return arg.substring(1, arg.length - 1);
    
    if (arg[0] === "'" && arg[arg.length - 1] === "'")
        return arg.substring(1, arg.length - 1);
    
    const address = getAddress(config, arg);
    
    if (!address)
        return arg;
    
    return address;
}

function getArguments(config, args) {
    if (args == null)
        return [];

    if (typeof args === 'string')
        args = args.split(',');
    else
        args = [ args ];
    
    for (let n in args)
        args[n] = getArgument(config, args[n]);
    
    return args;
}

function getContract(name, dirpath) {
    // TODO better testing
    // TODO if not found, try '..'
    if (!dirpath)
        dirpath = '.';
    
    const filename = path.join(dirpath, 'build', 'contracts', name + '.json');
    
    return JSON.parse(fs.readFileSync(filename).toString());
}

function collectTransactionOptions(opts, options) {
    if (opts.gas && options.gas == null)
        options.gas = opts.gas;
    if (opts.gasPrice && options.gasPrice == null)
        options.gasPrice = opts.gasPrice;
    if (opts.value && options.value == null)
        options.value = opts.value;
}

function getTransactionOptions(opts, config) {
    const options = {};
    
    if (opts)
        collectTransactionOptions(opts, options);
    if (config && config.options)
        collectTransactionOptions(config.options, options);
       
    return options;
}

function getTypes(text) {
    if (!text)
        return [];
    
    text = text.replace(/\s/g, '');;
    
    if (!text.length)
        return [];
    
    const p = text.indexOf('(');
    
    if (p >= 0)
        text = text.substring(p + 1);

    const p2 = text.indexOf(')');
    
    if (p2 >= 0)
        text = text.substring(0, p2);
    
    if (!text.length)
        return [];
    
    return text.split(',');
}

function addPending(config, txhash, verb, args, options) {
    if (!config.pending)
        config.pending = {};
        
    const description = verb + ' ' + args.join(' ');
    
    config.pending[txhash] = { description: description };
    
    if (options)
        for (let n in options)
            if (options[n])
                config.pending[txhash][n] = options[n];
}

module.exports = {
    getValue,
    getAddress,
    getAccount,
    withDecimals,
    getArguments,
    getContract,
    getTransactionOptions,
    getTypes,
    addPending,
    getHost
}

