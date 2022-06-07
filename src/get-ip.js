const rangeCheck = require('range_check');

/*
    CloudFlare IP Ranges from https://www.cloudflare.com/ips
 */
const ranges = {
    v4: [
        '103.21.244.0/22',
        '103.22.200.0/22',
        '103.31.4.0/22',
        '104.16.0.0/13',
        '104.24.0.0/14',
        '108.162.192.0/18',
        '131.0.72.0/22',
        '141.101.64.0/18',
        '162.158.0.0/15',
        '172.64.0.0/13',
        '173.245.48.0/20',
        '188.114.96.0/20',
        '190.93.240.0/20',
        '197.234.240.0/22',
        '198.41.128.0/17'
    ],
    v6: [
        '2400:cb00::/32',
        '2405:8100::/32',
        '2405:b500::/32',
        '2606:4700::/32',
        '2803:f800::/32',
        '2a06:98c0::/29',
        '2c0f:f248::/32'
    ]
};

module.exports = (req) => {
    const ip = req.ip;

    if (!req.headers['cf-connecting-ip']) {
        return ip;
    }
    /*
        Is behind CloudFlare proxy
     */
    const ipVer = rangeCheck.version(ip);

    if (ipVer === 4 && rangeCheck.inRange(ip, ranges.v4)) {
        return req.headers['cf-connecting-ip'];
    }
    if (ipVer === 6 && rangeCheck.inRange(ip, ranges.v6)) {
        return req.headers['cf-connecting-ip'];
    }
    return ip;
}