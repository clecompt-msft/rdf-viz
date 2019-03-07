import * as url from 'url';

import * as minimatch from 'minimatch';
import { Term } from 'rdf-js';

import { Config } from './types';

// Distinguish a URI from a path
export function isUri(path: string): boolean {
    try {
        return !!url.parse(path).host;
    } catch {
        return false;
    }
}

// Generate a compacted URI if possible, given a collection of namespaces
export function compactUri(
    uri: string,
    namespace: Config['namespace']
): string {
    for (const [ns, prefix] of Object.entries(namespace)) {
        if (uri.startsWith(prefix)) {
            return `${ns}:${uri.slice(prefix.length)}`;
        }
    }
    return uri;
}

// Generate an expanded URI if possible, given a collection of namespaces
export function expandUri(uri: string, namespace: Config['namespace']): string {
    for (const [ns, prefix] of Object.entries(namespace)) {
        if (uri.startsWith(`${ns}:`)) {
            return prefix + uri.slice(ns.length + 1);
        }
    }
    return uri;
}

// Find the value for a string in a collection of globs
export function findMatches<T>(
    value: string,
    collection: { [pattern: string]: T }
): T[] {
    const results: T[] = [];
    for (const [pattern, entry] of Object.entries(collection)) {
        if (minimatch(value, pattern)) {
            results.push(entry);
        }
    }
    return results;
}

// Ensure an array from a variety of inputs
export function toArray<T>(value: T | T[] | null | undefined): T[] {
    return Array.isArray(value) ? value : value != null ? [value] : [];
}

// Build display text based on the term type and value
export function termText(term: Term, config: Config): string {
    switch (term.termType) {
        case 'NamedNode':
            return compactUri(term.value, config.namespace);
        case 'BlankNode':
            return '_:' + term.value;
        case 'Variable':
            return '?' + term.value;
        case 'DefaultGraph':
            return '';
        case 'Literal':
            return term.value;
    }
}

// Storage for auto-generated classname
export const CLASS = Symbol();
