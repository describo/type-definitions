Describo requires a profile that defines the entities and their properties that can be
added. This folder has the tools to create that profile.

- [Setup](#setup)
- [Creating the type definitions data file from schema.org data](#creating-the-type-definitions-data-file-from-schemaorg-data)
- [How it works](#how-it-works)
- [Adding RO-Crate extensions](#adding-ro-crate-extensions)
- [Adding extensions to schema.org](#adding-extensions-to-schemaorg)
- [Context](#context)

## Setup

```bash
> npm install
```

## Creating the type definitions data file from schema.org data

To create the in built main profile for Describo:

```
> ./write-schema-org-types
```

This script will download the latest schema.org jsonld data file and extract the entities and
properties from it, writing a new set of type definitions for describo. The definitions are created
in the `types` folder.

## How it works

The script first downloads the schema.org jsonld file and extracts the class and property definitions from it. Then, it reads through all of the extensions in the folder `schema.org-extensions` and joins in the classes and properties defined in those.

As the extension definitions are joined in after the schema.org definitions, any definition in an extension that matches a definition in schema.org is used as a join key. With this it's possible to define classes and properties that join into schema.org and extend it.

For example, the `olac-roles` extension defines a class `https://schema.org/CreativeWork`. It then goes on to define a number of properties whose domain is `https://schema.org/CreativeWork`. So, when the script runs and encounters this second definition, it merges the properties defined in the extension into the definition for CreativeWork defined in schema.org.

Another example. In the extension pack `rico-extensions` there is a definition for `https://www.ica.org/standards/RiC/ontology#Relation` (as defined in RiC-O) as a subClass of `https://schema.org/Thing`. When this class is encountered, it is joined in as a sub class of Thing and thus slots into the hierarchy.


## Adding RO-Crate extensions

RO-Crate defines things that are not in schema.org. Add them to the extension file `ro-crate-additional-schema`.


## Adding extensions to schema.org

Adding a new extension invoves creating a new folder in `schema.org-extensions` and putting an RO-Crate file in it. You can use Describo to create the extension. Get Describo ([https://describo.github.io/desktop.html](https://describo.github.io/desktop.html)) then select the folder you created. Be sure to set the mode to `Power User`.

When you're in the `Describe` tab of the workspace, `Apply a profile` and select the `schema.org/vocabulary-creation-profile.json` from the Describo Profiles Repository.

1. On the `About` tab: Set Name, License, Description, Author and Main Entity on the about tab. Main entity should point to the original Ontology which you are using to extend the schema.org descriptions or other relevant entity.
2. Navigate to the `Definitions` tab and add your class and property definitions.

Points to note:
* You must join your classes into the schema.org hierarchy. To do that, add a class definition for a schema.org class and then set your class as a subclass to it. Look at `rico-extensions` for an example where `Relation` is subclassed to `Thing`.
* Likewise if you add properties. Add in the schema.org class to which those properties should be attached and then define and attach the properties to that instance. The script will join these definitions into the tree.
* Don't put RO-Crate spec defined things in any of these files. Add them to the `ro-crate-additional-schema` extension. This script writes out a Describo context file so putting ro-crate things in here will result in duplicate context entries (the RO-Crate context defines their extensions).

## Context

This tool will create a context with all of the additions found in the extensions. It should be used as a complement to - not a replacement for - the RO-Crate context.

```JSON
{
    "@context": [
        "https://w3id.org/ro/crate/1.1/context",
        "https://describo.github.io/type-definitions/context/1.0/context.jsonld"
    ],
    "@graph": [ ... ]
}

```