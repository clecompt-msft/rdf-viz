import {
    EdgeDataDefinition,
    EdgeDefinition,
    ElementsDefinition,
    NodeDefinition,
} from 'cytoscape';
import { Quad, Quad_Graph, Term } from 'rdf-js';
import * as uuid from 'uuid/v4';

import { Config, Style } from './types';
import { CLASS, findMatches, termText } from './utility';

enum rdf {
    type = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    first = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first',
    rest = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest',
    nil = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil',
}

// Build unique IDs depending on the term type
function termId(term: Term, graph: Quad_Graph, decouple?: boolean): string {
    switch (term.termType) {
        // All default graphs are the same
        case 'DefaultGraph':
            return '';

        // Use the URI as the ID, unless the term has been
        // explicitly decoupled in order to improve visualization
        case 'NamedNode':
            return decouple ? uuid() : term.value;

        // Blank and variable terms need to include their containing graph,
        // as non-equal terms in different graphs may share a name
        case 'BlankNode':
            return `${graph.value}#${term.value}`;
        case 'Variable':
            return `${graph.value}?${term.value}`;

        // Though RDF considers all literals with the same value equal,
        // that is not useful from a visualization perspective; give each
        // literal a completely unique ID
        case 'Literal':
            return uuid();
    }
}

// Get or ensure a class name for a particular style definition
function className(style: Style.Any): string {
    return (style[CLASS] = style[CLASS] || 'class-' + uuid());
}

class Graph {
    private readonly nodes: { [id: string]: NodeDefinition } = {};
    private readonly edges: { [id: string]: EdgeDefinition } = {};
    private readonly lists: { [id: string]: NodeDefinition } = {};
    private readonly config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    // Styles can be style objects or string references;
    // find the collection of classes associated with this URI
    private styles<S extends Style.Any = Style.Any>(
        uri: string,
        key: keyof Style
    ): S[] {
        let styles: S[] = [];
        for (const style of findMatches(uri, this.config.style[key])) {
            if (typeof style === 'string') {
                styles = styles.concat(this.styles(style, key));
            } else if (style) {
                styles.push(style as S);
            }
        }
        return styles;
    }

    // Determine if this URI has a particular node presentation via styles
    private present(
        presentation: Style.NodePresentation,
        term: Term,
        key: 'node' | 'edge'
    ): boolean {
        return (
            term.termType === 'NamedNode' &&
            this.styles<Style.Node | Style.Edge>(term.value, key).some(
                style => style['node-presentation'] === presentation
            )
        );
    }

    // Determine if this edge is reverse layout via styles
    private reverse(term: Term): boolean {
        return (
            term.termType === 'NamedNode' &&
            this.styles<Style.Edge>(term.value, 'edge').some(
                style => style['layout-direction'] === 'reverse'
            )
        );
    }

    // Get the CSS style string for this term
    private classes(term: Term, key: keyof Style): string {
        return term.termType !== 'NamedNode'
            ? ''
            : this.styles(term.value, key)
                  .map(style => ' ' + className(style))
                  .join('');
    }

    // Add a node to the graph
    private node(
        term: Term,
        graph: Quad_Graph,
        decouple?: boolean
    ): NodeDefinition {
        const data = {
            id: termId(term, graph, decouple),
            text: termText(term, this.config),
            types: [],
            values: [],
            out: [],
            in: [],
            remove: this.present('none', term, 'node'),
        };
        return (this.nodes[data.id] = this.nodes[data.id] || {
            data,
            classes: term.termType + this.classes(term, 'node'),
        });
    }

    // Add an edge to the graph
    private edge(
        term: Term,
        graph: Quad_Graph,
        source: NodeDefinition,
        target: NodeDefinition,
        rdfClass?: string
    ): EdgeDefinition {
        // If the edge is reversed, swap its endpoints
        const reversed = this.reverse(term);
        const src = reversed ? target : source;
        const tgt = reversed ? source : target;

        const data = {
            id: termId(term, graph, true),
            text: termText(term, this.config),
            source: src.data.id!,
            target: tgt.data.id!,
            remove: this.present('none', term, 'edge'),
        };
        const edge = (this.edges[data.id] = this.edges[data.id] || {
            data,
            classes:
                (rdfClass || term.termType + this.classes(term, 'edge')) +
                (reversed ? ' reverse' : ' forward'),
        });

        // Add the edge to its nodes
        src.data.out.push(edge);
        tgt.data.in.push(edge);

        return edge;
    }

    // Add a list group to the graph
    private list(source: NodeDefinition, target: NodeDefinition) {
        const data = {
            id: uuid(),
        };
        this.lists[data.id] = { data, classes: 'ListGroup' };

        source.data.next = target;
        target.data.prev = source;

        let element: NodeDefinition;

        source.data.parent = data.id;
        target.data.parent = data.id;

        element = source;
        while (element.data.prev) {
            element = element.data.prev;
            delete this.lists[element.data.parent!];
            element.data.parent = data.id;
        }

        element = target;
        while (element.data.next) {
            element = element.data.next;
            delete this.lists[element.data.parent!];
            element.data.parent = data.id;
        }
    }

    // Add a quad to the graph
    add(quad: Quad) {
        // Add the source node to the nodes collection
        const source = this.node(quad.subject, quad.graph);

        let rdfEdge: string | undefined;

        // Handle special RDF predicates
        switch (quad.predicate.value) {
            // Types are displayed as a tooltip and style, not in the graph
            case rdf.type:
                source.data.types.push(quad.object);
                const classes = this.classes(quad.object, 'type');
                source.classes += classes;
                if (
                    !this.config.option.showTypeEdge ||
                    this.config.option.showTypeEdge === 'never' ||
                    (this.config.option.showTypeEdge === 'unstyled' && classes)
                ) {
                    return;
                }
                rdfEdge = 'TypeEdge';
                break;

            // List targets act like normal edges, but have special styles
            case rdf.first:
                rdfEdge = 'ListEdge';
                break;

            // Lists are grouped under parent nodes
            case rdf.rest:
                const isNil =
                    quad.object.termType === 'NamedNode' &&
                    quad.object.value === rdf.nil;
                const target = this.node(quad.object, quad.graph, isNil);

                // If this is nil or a blank node, replace its class with a special list class
                source.classes = source.classes!.replace(
                    'BlankNode',
                    'ListNode'
                );
                target.classes = target.classes!.replace(
                    isNil ? 'NamedNode' : 'BlankNode',
                    'ListNode'
                );

                this.edge(
                    quad.predicate,
                    quad.graph,
                    source,
                    target,
                    'ListEdge'
                );
                this.list(source, target);
                return;
        }

        // Literal values are displayed as a tooltip, not in the graph
        if (quad.object.termType === 'Literal') {
            // Since literals aren't filtered out later, do it now
            if (this.present('none', quad.predicate, 'edge') && !rdfEdge) {
                return;
            }

            // Add the literal values to the node
            source.data.values.push([quad.predicate, quad.object]);

            // Mark blank nodes with values with a special class,
            // so we can indicate their relevance visually
            if (quad.subject.termType === 'BlankNode') {
                source.classes = source.classes!.replace(
                    /BlankNode|ListNode/,
                    'ValueNode'
                );
            }
            return;
        }

        // Add the predicate and object to the graph
        const target = this.node(
            quad.object,
            quad.graph,
            (!rdfEdge && this.present('multiple', quad.predicate, 'edge')) ||
                this.present('multiple', quad.object, 'node')
        );
        this.edge(quad.predicate, quad.graph, source, target, rdfEdge);
    }

    // Get the graph elements
    done(): ElementsDefinition {
        // List nodes should only consider the
        // first node of the list for removal
        const rootNode = (
            node?: NodeDefinition
        ): NodeDefinition | undefined => {
            if (node) {
                let root = node;
                while (root.data.prev) {
                    root = root.data.prev;
                }
                return this.nodes[root.data.id!];
            }
            return undefined;
        };

        // Filter out any removed nodes
        for (const [id, node] of Object.entries(this.nodes)) {
            const root = rootNode(node);

            // If the observed node was explicitly or already removed,
            // short circuit removing this one as well
            if (!root || root.data.remove) {
                delete this.nodes[id];
                if (root && root.data.parent) {
                    delete this.nodes[root.data.parent];
                }
            } else {
                // Ensure the edge has not been explicitly removed,
                // nor has its other endpoint
                const edgeIsPresent = (
                    edge: EdgeDefinition,
                    dir: keyof EdgeDataDefinition
                ) => {
                    const end = rootNode(this.nodes[edge.data[dir]]);
                    return !edge.data.remove && end && !end.data.remove;
                };

                const ins: EdgeDefinition[] = root.data.in.filter(
                    (edge: EdgeDefinition) => edgeIsPresent(edge, 'source')
                );
                const outs: EdgeDefinition[] = root.data.out.filter(
                    (edge: EdgeDefinition) => edgeIsPresent(edge, 'target')
                );

                // If the node has no meaningful relationships, remove it
                if (
                    ins.length === 0 &&
                    outs.length === 0 &&
                    root.data.types.length === 0 &&
                    root.data.values.length === 0
                ) {
                    delete this.nodes[id];
                    if (root.data.parent) {
                        delete this.nodes[root.data.parent];
                    }
                }
            }
        }

        // If an edge or either its endpoints have been removed, remove it
        for (const [id, edge] of Object.entries(this.edges)) {
            if (
                edge.data.remove ||
                !this.nodes[edge.data.source] ||
                !this.nodes[edge.data.target]
            ) {
                delete this.edges[id];
            }
        }

        return {
            nodes: Object.values(this.nodes).concat(Object.values(this.lists)),
            edges: Object.values(this.edges),
        };
    }
}

// Process input quads into graph data
export default function(quads: Quad[], config: Config): ElementsDefinition {
    const graph = new Graph(config);
    for (const quad of quads) {
        graph.add(quad);
    }
    return graph.done();
}
