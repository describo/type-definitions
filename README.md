The Describo online UI requires a profile that defines the entities and their properties that can be
added. This folder has the tools to create that profile.

- [Setup](#setup)
- [Creating the type definitions data file from schema.org data](#creating-the-type-definitions-data-file-from-schemaorg-data)
- [Adding RO-Crate extra entity definitions](#adding-ro-crate-extra-entity-definitions)
- [Rename entities and properties](#rename-entities-and-properties)
- [Adding entity types to properties](#adding-entity-types-to-properties)
- [Compound types](#compound-types)

## Setup

```bash
> npm install
```

## Creating the type definitions data file from schema.org data

```
> ./write-schema-org-types
```

This script will download the latest schema.org jsonld data file and extract the entities and
properties from it, writing a new set of type definitions for describo. The definitions are created
in the `types` folder.

## Adding RO-Crate extra entity definitions

RO-Crate defines things that are not in schema.org. To create type definitions for them add a file
for them into the folder `schema.org-extensions`. Note that it must be an `ro-crate`file and it must
conform `exactly` to the structure of the schema.org.jsonld file.

When adding entities into this file ensure all of the links use the original entity names not the
ro-crate names. For example, `link X to pcdm:Object` not `pcdm:RepositoryObject`. The entity
renaming occurs at a later stage so you don't have to worry about this (and the mapping would fail
anyway as you'd be trying to associate to something that doesn't exist at that point)

## Rename entities and properties

In RO-Crate the `MediaObject` entity is renamed to `File`. In order to create a type definition data
structure that matches the spec you can define rename rules under the `rename` property in
`./configuration.js`. Specifically, you can rename classes and properties. Note the structure and
existing examples. The rename step occurs after the type definition data structure has been created
and the context has been compacted.

## Adding entity types to properties

Some properties like `hasPart` should allow adding more entity types than just those defined in
schema.org. You can define these extra definitions in the `addTypesToProperty` property in
`./configuration.js`. Specifically, define the property that you wish to augment and set it to an
object with one property `types` which is the array of types that property should allow linking to.
This is additive with the schema.org defintion and duplicate entries are automatically removed.

## Compound types

The RO-Crate spec defines compound types that can be added to the crate. In order to have those
available in the UI you define them in the property `compoundTypes` in `./configuration.js` and
these will be made available in the update type definitions.
