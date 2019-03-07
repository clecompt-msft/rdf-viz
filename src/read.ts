import * as fs from 'fs';
import { Stream } from 'stream';
import * as url from 'url';
import * as util from 'util';

import { namedNode } from '@rdfjs/data-model';
import { parsers } from '@rdfjs/formats-common';
import * as getStream from 'get-stream';
import * as glob from 'glob';
import { Quad } from 'rdf-js';
import * as request from 'request';

import { isUri } from './utility';

// Enforce source originator in graph and named nodes
function deanonymize(source: string, quad: Quad): Quad {
    for (const term of ['subject', 'predicate', 'object', 'graph']) {
        if (quad[term].termType === 'NamedNode' && quad[term].value === null) {
            quad[term].value = source;
        }
    }
    if (quad.graph.termType === 'DefaultGraph') {
        quad.graph = namedNode(source);
    }
    return quad;
}

// Read triples from stream in a given format
async function readStream(
    source: string,
    stream: Stream,
    format: string
): Promise<Quad[]> {
    return (await getStream.array<Quad>(parsers.import(format, stream))).map(
        quad => deanonymize(source, quad)
    );
}

// Read triples from files in a given format
async function readFiles(files: string, format: string): Promise<Quad[]> {
    let triples: Quad[] = [];
    for (const pathname of await util.promisify(glob)(files)) {
        triples = triples.concat(
            await readStream(
                url.format({ protocol: 'file:', pathname }),
                fs.createReadStream(pathname),
                format
            )
        );
    }
    return triples;
}

// Read triples from a URI in a given format
async function readUri(uri: string, format: string): Promise<Quad[]> {
    return readStream(uri, request(uri), format);
}

// Read triples in a given format
export default async function(path: string, format: string): Promise<Quad[]> {
    return isUri(path) ? readUri(path, format) : readFiles(path, format);
}
