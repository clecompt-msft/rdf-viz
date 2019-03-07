import * as path from 'path';

import * as deepmerge from 'deepmerge';

import { Config, Style } from './types';
import { expandUri, isUri, toArray } from './utility';

// Splice configuration from a file into the given configuration object
export default function loadConfig(
    file: string,
    config: Partial<Config> = {}
): Config {
    let conf: Partial<Config> = require(file);

    // Normalize relative paths to absolute
    if (conf.source) {
        const source: Config['source'] = {};
        for (const [src, fmt] of Object.entries(conf.source)) {
            source[resolve(file, src)] = fmt;
        }
        conf.source = source;
    }
    if (conf.proxy) {
        for (const [uri, tgt] of Object.entries(conf.proxy)) {
            conf.proxy[uri] = resolve(file, tgt);
        }
    }

    // If we're inheriting any configurations, include all of them first
    for (const include of toArray(conf['@include']).reverse()) {
        const inc =
            path.basename(include) === include
                ? path.resolve(__dirname, '../config', include)
                : resolve(file, include);
        conf = loadConfig(inc, conf);
    }

    // Normalize styles
    if (conf.style) {
        conf.style.type = normalizeStyles(conf.style.type, conf.namespace);
        conf.style.node = normalizeStyles(conf.style.node, conf.namespace);
        conf.style.edge = normalizeStyles(conf.style.edge, conf.namespace);
    }

    return deepmerge(conf, config);
}

// Resolve a file relative to the current one, if it is a path
function resolve(file: string, next: string): string {
    return isUri(next) ? next : path.resolve(path.dirname(file), next);
}

// Normalize all style URIs to their full form
function normalizeStyles<S extends Style.Any>(
    bag: Style.Map<S>,
    ns?: Config['namespace']
): Style.Map<S> {
    if (!bag || !ns) {
        return bag;
    }
    const normalized: Style.Map<S> = {};
    for (const [uri, style] of Object.entries(bag)) {
        normalized[expandUri(uri, ns)] =
            typeof style === 'string' ? expandUri(style, ns) : style;
    }
    return normalized;
}
