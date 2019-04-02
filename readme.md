# rdf-viz

A tool for visualizing RDF files in graph form.

## Usage

RDF source files and other options are provided via
[configuration file](#configuration) input. If using the packaged version:
`rdf-viz <config>` (note that due to the packaging mechanism, config paths must
be relative to the executable, not the CWD). If running from the repository:
`npm i` at least once, followed by `npm start -- <config>`.

### RDF display

Particular well-known RDF relationships are displayed in a special manner to
improve visualization:

-   `rdf:type`: Types are displayed in the upper tooltip on node mouseover.
-   `rdf:value`: Literal value relationships are displayed in the lower tooltip
    on node mouseover. The datatype or language for any given value will be
    displayed in a further tooltip upon mousing over that value.
-   `rdf:List`: List relationships are grouped together and treated similar to a
    single node.

## Configuration

Configuration files are JSON files which can include the following fields:

-   `@include`: Configuration file(s) to inherit from. Can be a path pointing to
    another configuration JSON relative to the current configuration file or a
    string referencing one of the
    [built-in configurations](#built-in-configurations).
-   `source`: A map of source files (either URLs or glob-style paths) to their
    media types (e.g. `"application/ld+json"` or `"text/turtle"`).
-   `proxy`: A map of URL paths to local directories. The visualizer will
    redirect any references under a given path to the corresponding directory;
    this is useful when, for example, JSON-LD files reference contexts by URL
    that need to be retrieved from disk.
-   `namespace`: A map of namespace abbreviations to their full URL, providing
    compacted URLs for visualization.
-   `style`: Replacements for the default styles for ease of visualization. Each
    group is a map of URL globs (full or compacted using the configured
    namespaces) to [Cytoscape.js](js.cytoscape.org) style objects.
    -   `type`: Node styles for `rdf:type` relations.
    -   `node`: Node styles by term URL. Includes the following special styles:
        -   `node-presentation`: Determines how RDF terms are included in the
            graph. Can be one of `single` (each unique term is displayed once;
            default), `multiple` (each reference to a term is displayed as a
            unique node), or `none` (the term is not displayed).
    -   `edge`: Edge styles by predicate URL. Includes the following special
        styles:
        -   `node-presentation`: As per `node` (above), but acting on the edge
            and/or its target.
        -   `layout-direction`: Determines how the layout algorithm treats these
            edges. Can be one of `forward` (default) or `reverse`.
-   `option`: Miscellaneous display options:
    -   `showTypeEdge`: One of `never` (types are only displayed in the
        tooltips; default), `unstyled` (type edges are displayed for types which
        don't have an applied style), or `always` (type edges are always
        displayed).

### Built-in configurations

The following are the available built-in configuration files that can be
imported. They provide no sources, but include namespaces and styles useful for
viewing various RDF standards.

-   `rdfs`: Useful for viewing [RDF Schema](https://www.w3.org/TR/rdf-schema/)
    class diagrams.
-   `sh`: Useful for viewing [SHACL](https://www.w3.org/TR/shacl/) constraints.
