import { Sink } from 'rdf-js';
import { Stream } from 'stream';

export declare class SinkMap extends Map<string, Sink> {
    import(type: string, stream: Stream): Stream;
}

export declare const parsers: SinkMap;
export declare const serializers: SinkMap;