import { NodeSingular } from 'cytoscape';
import { Literal, Quad_Object, Quad_Predicate } from 'rdf-js';
import * as tippy from 'tippy.js';

import { Config } from './types';
import { termText } from './utility';

// Create a tooltip given a set of options
function createTooltip(
    targets: tippy.Targets,
    props: tippy.Props
): tippy.Instance {
    return (tippy as any)(targets, {
        arrow: true,
        flipOnUpdate: true,
        ignoreAttributes: true,
        interactive: true,
        multiple: true,
        theme: 'light-border',
        trigger: 'manual',
        sticky: true,
        ...props,
    });
}

// Add tooltip to a node
function addNodeTooltip(
    node: NodeSingular,
    props: tippy.Props
): tippy.Instance {
    const tip = createTooltip((node as any).popperRef(), props);
    node.on('mouseover', () => tip.show());
    node.on('mouseout', () => tip.hide());
    return tip;
}

// Add tooltip to an element
function addElementTooltip(
    element: HTMLElement,
    props: tippy.Props
): tippy.Instance {
    const tip = createTooltip(element, props);
    element.addEventListener('mouseover', () => tip.show());
    element.addEventListener('mouseout', () => tip.hide());
    return tip;
}

// Add tooltips for types and literals
export default function(node: NodeSingular, config: Config) {
    // Add type URIs to the upper tooltip
    const types: Quad_Object[] = node.data('types') || [];
    if (types.length > 0) {
        const content = document.createElement('table');
        content.classList.add('types');

        // Append compacted URI
        for (const type of types) {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${termText(type, config)}</td>`;
            content.appendChild(row);
        }

        addNodeTooltip(node, {
            content,
            flipBehavior: ['top', 'left', 'right'],
            placement: 'top',
            zIndex: 1,
        });
    }

    // Add literal predicates and values to the lower tooltip
    const values: [Quad_Predicate, Literal][] = node.data('values') || [];
    if (values.length > 0) {
        const content = document.createElement('table');
        content.classList.add('values');

        const tips: tippy.Instance[] = [];

        // Append predicate -> value
        for (const [predicate, literal] of values) {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${termText(
                predicate,
                config
            )}</td><td>&rarr;</td><td>${termText(literal, config)}</td>`;
            content.appendChild(row);

            // Add the datatype as a secondary tooltip
            tips.push(
                addElementTooltip(row, {
                    content: `<table><tr><td>${
                        literal.language
                            ? `@${literal.language}`
                            : termText(literal.datatype, config)
                    }</td></tr></table>`,
                    flipBehavior: ['right', 'left'],
                    placement: 'right',
                    zIndex: 3,
                })
            );
        }

        addNodeTooltip(node, {
            content,
            flipBehavior: ['bottom', 'right', 'left'],
            onHide: () => tips.forEach(tip => tip.disable()),
            onShow: () => tips.forEach(tip => tip.enable()),
            placement: 'bottom',
            zIndex: 2,
        });
    }
}
