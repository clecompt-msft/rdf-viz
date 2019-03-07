import * as electron from 'electron';
import * as path from 'path';

import * as cytoscape from 'cytoscape';
import { Quad } from 'rdf-js';

import loadConfig from './config';
import generateGraph from './graph';
import enableProxy from './proxy';
import readQuads from './read';
import buildStyles from './style';
import addTooltips from './tooltip';
import { Config } from './types';

cytoscape.use(require('cytoscape-klay'));
cytoscape.use(require('cytoscape-popper'));

// Load the graph from config into the target container
async function load(container: HTMLElement) {
    let config: Config = {
        source: {},
        proxy: {},
        namespace: {},
        style: {
            type: {},
            node: {},
            edge: {},
        },
    };

    // Acquire the configuration from args
    const { argv, cwd } = electron.remote.getGlobal('shared');
    for (const arg of argv.reverse()) {
        config = loadConfig(path.resolve(cwd, arg), config);
    }

    // Enable proxying before we start reading input
    enableProxy(config);

    // Read in all inputs
    let quads: Quad[] = [];
    for (const [source, format] of Object.entries(config.source)) {
        quads = quads.concat(await readQuads(source, format));
    }

    // Generate the graph
    const cy = cytoscape({
        container,
        elements: generateGraph(quads, config),
        style: buildStyles(config),
        layout: {
            name: 'klay',
            nodeDimensionsIncludeLabels: true,
            klay: {
                compactComponents: true,
                layoutHierarchy: true,
                nodePlacement: 'LINEAR_SEGMENTS',
                thoroughness: 32,
            },
        } as any,
    });
    cy.nodes().forEach(node => addTooltips(node, config));

    return cy;
}

export = load;
