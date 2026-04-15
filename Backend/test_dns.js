import dns from 'node:dns';
dns.resolveSrv('_mongodb._tcp.maindb.8cuidwo.mongodb.net', (err, addresses) => {
    if (err) {
        console.error('Local DNS Error:', err);
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        dns.resolveSrv('_mongodb._tcp.maindb.8cuidwo.mongodb.net', (err2, addresses2) => {
            if (err2) {
                console.error('Google DNS also failed:', err2);
            } else {
                console.log('Google DNS Success:', addresses2);
            }
        });
    } else {
        console.log('Local DNS Success:', addresses);
    }
});
