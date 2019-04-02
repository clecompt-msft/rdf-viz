import { StylesheetStyle } from 'cytoscape';

import { Config } from './types';
import { CLASS } from './utility';

// Apply default and configured styles (that are being utilized)
export default function(config: Config) {
    // Basic node and edge styles
    const defaultStyles = [
        {
            selector: 'edge',
            style: {
                label: 'data(text)',
                width: 2,
                'arrow-scale': 2,
                'curve-style': 'bezier',
                'line-color': 'silver',
                'target-arrow-color': 'silver',
                'target-arrow-shape': 'vee',
                'text-rotation': 'autorotate',
                'text-outline-color': 'white',
                'text-outline-width': 2,
                'text-outline-opacity': 0.5,
            },
        },
        {
            selector: 'node',
            style: {
                'background-opacity': 0,
                'background-color': 'silver',
                'border-color': 'silver',
                'border-width': 4,
                'text-valign': 'center',
                'text-halign': 'center',
                'text-outline-color': 'white',
                'text-outline-width': 4,
                'text-outline-opacity': 0.5,
            },
        },
    ];

    // Styles for node by term type
    const termTypeStyles = [
        {
            selector: 'node.NamedNode',
            style: {
                label: 'data(text)',
                width: 32,
                height: 32,
            },
        },
        {
            selector: 'node.BlankNode',
            style: {
                width: 8,
                height: 8,
            },
        },
        {
            selector: 'node.Literal',
            style: { display: 'none' },
        },
        {
            selector: 'node.Variable',
            style: { display: 'none' },
        },
        {
            selector: 'node.DefaultGraph',
            style: { display: 'none' },
        },
    ];

    // Extra styles for RDF display behavior
    const rdfStyles = [
        {
            selector: 'node.ListGroup',
            style: {
                shape: 'roundrectangle',
                'border-opacity': 0.5,
            },
        },
        {
            selector: 'node.ListNode',
            style: {
                width: 4,
                height: 4,
            },
        },
        {
            selector: 'edge.ListEdge',
            style: {
                label: '',
            },
        },
        {
            selector: 'node.ValueNode',
            style: {
                width: 16,
                height: 16,
            },
        },
        {
            selector: 'edge.TypeEdge',
            style: {
                label: '',
                'line-style': 'dashed',
            },
        },
    ];

    // Combine base styles and configured styles
    const styles = (defaultStyles as StylesheetStyle[])
        .concat(termTypeStyles)
        .concat(rdfStyles);

    for (const map of Object.values(config.style)) {
        for (const style of Object.values(map)) {
            if (style && typeof style === 'object' && style[CLASS]) {
                styles.push({ style, selector: '.' + style[CLASS] });
            }
        }
    }

    // Generate forward/reverse edge styles
    let adjustment = 1;
    for (const [index, sheet] of styles.slice().entries()) {
        const forward = {};
        const reverse = {};
        for (const [key, value] of Object.entries(sheet.style) as string[][]) {
            if (key.includes('source')) {
                delete sheet.style[key];
                forward[key] = value;
                reverse[key.replace('source', 'target')] = value;
            } else if (key.includes('target')) {
                delete sheet.style[key];
                forward[key] = value;
                reverse[key.replace('target', 'source')] = value;
            } else if (key.includes('distances') || key.includes('weights')) {
                delete sheet.style[key];
                forward[key] = value;
                reverse[key] = value
                    .split(' ')
                    .reverse()
                    .join(' ');
            } else {
                switch (key) {
                    case 'line-gradient-stop-colors':
                        delete sheet.style[key];
                        forward[key] = value;
                        reverse[key] = value
                            .split(' ')
                            .reverse()
                            .join(' ');
                        break;
                    case 'line-gradient-stop-positions':
                        delete sheet.style[key];
                        forward[key] = value;
                        reverse[key] = value
                            .split(' ')
                            .reverse()
                            .map(percent => 100 - parseFloat(percent) + '%')
                            .join(' ');
                        break;
                }
            }
        }

        if (Object.keys(forward).length > 0) {
            styles.splice(
                index + adjustment,
                0,
                {
                    selector: sheet.selector + '.forward',
                    style: forward,
                },
                {
                    selector: sheet.selector + '.reverse',
                    style: reverse,
                }
            );
            adjustment += 2;
        }
    }

    return styles;
}
