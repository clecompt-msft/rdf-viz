import { Css } from 'cytoscape';

export interface Style {
    type: Style.Map<Style.Type>;
    node: Style.Map<Style.Node>;
    edge: Style.Map<Style.Edge>;
}

export namespace Style {
    export type NodePresentation = 'single' | 'multiple' | 'none';

    export interface Type extends Css.Node {}

    export interface Node extends Css.Node {
        'node-presentation'?: NodePresentation;
    }

    export interface Edge extends Css.Edge {
        'node-presentation'?: NodePresentation;
    }

    export type Any = Edge | Type | Node;
    export interface Map<S extends Any = Any> {
        [uri: string]: S | string;
    }
}

export interface Option {
    showTypeEdge?: Option.ShowTypeEdge;
}

export namespace Option {
    export type ShowTypeEdge = 'never' | 'unstyled' | 'always';
}

export interface Config {
    // source glob | URI => source format
    source: { [path: string]: string };

    // URI => local folder
    proxy: { [uri: string]: string };

    // abbreviation => URI
    namespace: { [ns: string]: string };

    // URI glob => style | reference | removal
    style: Style;

    // Misc. options
    option: Option;
}
