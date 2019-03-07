import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

import * as nock from 'nock';

import { Config } from './types';

// In order to be able to pull sources purely from disk,
// mock out requests as determined by proxy configuration
export default function(config: Config) {
    const hosts: { [host: string]: { path: string; file: string }[] } = {};

    for (const [server, folder] of Object.entries(config.proxy)) {
        const { protocol, hostname, pathname } = url.parse(server);
        const host = `${protocol}//${hostname}`;
        hosts[host] = hosts[host] || [];
        hosts[host].push({ path: pathname || '', file: folder });
    }

    for (const [host, proxies] of Object.entries(hosts)) {
        const scope = nock(host).persist();
        for (const proxy of proxies) {
            scope
                .get(uri => uri.startsWith(proxy.path))
                .reply(200, (uri: string) =>
                    fs.readFileSync(
                        path.join(proxy.file, uri.replace(proxy.path, '')),
                        'utf8'
                    )
                );
        }
    }
}
