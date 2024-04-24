import { describe, it, test, expect } from "vitest";
import {
    readExtension,
    stripPrefix,
    normaliseEntity,
    normaliseEntities,
    getRootDataset,
    expandIdentifiers,
    extractClasses,
    extractProperties,
    createDescriboMainProfile,
} from "./lib.js";

import { readJSON, pathExists } from "fs-extra/esm";

describe("Testing extension file methods", () => {
    it(`should be able to read an extension file`, async () => {
        let crate = await readExtension({ name: "ro-crate-additional-schema" });
        expect(crate).toBeDefined();

        let rootDataset = getRootDataset({ crate });
        expect(rootDataset.mentions.length).toEqual(13);
    });

    it(`should be able to remove prefix's`, () => {
        let value = stripPrefix("schema:Person");
        expect(value).toEqual("Person");

        value = stripPrefix("http://schema.org/Person");
        expect(value).toEqual("Person");

        value = stripPrefix("https://schema.org/Person");
        expect(value).toEqual("Person");

        value = stripPrefix("https://pcdm.org/models#Person");
        expect(value).toEqual("Person");
    });

    it("should be able to normalise class definitions", () => {
        let entity = {
            "@id": "pcdm:Collection",
            "@type": "rdfs:Class",
            name: "Collection",
            "rdfs:comment":
                "A Collection is a group of resources. Collections have descriptive metadata, access metadata, and may links to works and/or collections. By default, member works and collections are an",
            "rdfs:label": "Collection",
        };
        expect(() => normaliseEntity(entity)).toThrowError();

        entity = {
            "@id": "pcdm:Collection",
            "@type": "rdfs:Class",
            name: "Collection",
            "rdfs:comment":
                "A Collection is a group of resources. Collections have descriptive metadata, access metadata, and may links to works and/or collections. By default, member works and collections are an",
            "rdfs:label": "Collection",
            "rdfs:subClassOf": { "@id": "https://schema.org/Thing" },
        };

        let e = normaliseEntity(entity);
        expect(e).toMatchObject({
            name: "Collection",
            label: "Collection",
            domain: ["Thing"],
        });
    });

    it("should be able to normalise property definitions", () => {
        let entity = {
            "@id": "pcdm:fileOf",
            "@type": "rdf:Property",
            name: "fileOf",
            domainIncludes: { "@id": "https://schema.org/File" },
            inverseOf: "",
            rangeIncludes: { "@id": "pcdm:Object" },
            "rdfs:comment": "Links from a File to its containing Object.",
            "rdfs:label": "fileOf",
        };
        expect(() => normaliseEntity(entity)).toThrowError();

        entity = {
            "@id": "pcdm:fileOf",
            "@type": "rdf:Property",
            name: "fileOf",
            "schema:domainIncludes": { "@id": "https://schema.org/File" },
            inverseOf: "",
            "schema:rangeIncludes": { "@id": "pcdm:Object" },
            "rdfs:comment": "Links from a File to its containing Object.",
            "rdfs:label": "fileOf",
        };
        let e = normaliseEntity(entity);
        expect(e).toMatchObject({
            name: "fileOf",
            label: "fileOf",
            domain: ["File"],
            range: ["Object"],
        });
    });

    it("should extract classes and properties from the olac roles extension", async () => {
        let crate = await readExtension({ name: "olac-roles" });
        crate = normaliseEntities({ crate });
        crate = expandIdentifiers({ crate });
        let properties = extractProperties({ crate });
        expect(properties.length).toEqual(24);

        let classes = extractClasses({ crate });
        expect(classes.length).toEqual(0);
    });

    it(`should be able to expand all identifiers in a crate`, async () => {
        let crate = {
            "@context": {
                pcdm: "https://pcdm.org/models#",
                rdf: "https://www.w3.org/1999/02/22-rdf-syntax-ns#",
                rdfs: "https://www.w3.org/2000/01/rdf-schema#",
                schema: "https://schema.org/",
                bio: "https://bioschemas.org/",
            },
            "@graph": [
                {
                    "@id": "ro-crate-metadata.json",
                    "@type": "CreativeWork",
                    conformsTo: { "@id": "https://w3id.org/ro/crate/1.1" },
                    about: { "@id": "./" },
                    name: "ro-crate-metadata.json",
                    "@reverse": {},
                },
                {
                    "@id": "./",
                    "@type": "Dataset",
                    name: "My Research Object Crate",
                    "@reverse": { about: { "@id": "ro-crate-metadata.json" } },
                    mentions: [
                        { "@id": "pcdm:Collection" },
                        { "@id": "pcdm:Object" },
                        { "@id": "bio:ComputationalWorkflow" },
                        { "@id": "bio:FormalParameter" },
                        { "@id": "pcdm:fileOf" },
                        { "@id": "pcdm:hasFile" },
                        { "@id": "pcdm:hasMember" },
                        { "@id": "pcdm:memberOf" },
                        { "@id": "schema:resultOf" },
                        { "@id": "bio:ComputationalWorkflow#input" },
                        { "@id": "bio:ComputationalWorkflow#output" },
                    ],
                },
                {
                    "@id": "pcdm:Collection",
                    "@type": "rdfs:Class",
                    name: "Collection",
                    "rdfs:comment":
                        "A Collection is a group of resources. Collections have descriptive metadata, access metadata, and may links to works and/or collections. By default, member works and collections are an",
                    "rdfs:label": "Collection",
                    "rdfs:subClassOf": { "@id": "schema:Thing" },
                    "@reverse": {
                        mentions: { "@id": "./" },
                        domainIncludes: [{ "@id": "pcdm:hasMember" }, { "@id": "pcdm:memberOf" }],
                        rangeIncludes: [{ "@id": "pcdm:hasMember" }, { "@id": "pcdm:memberOf" }],
                    },
                },
                {
                    "@id": "pcdm:fileOf",
                    "@type": "rdf:Property",
                    name: "fileOf",
                    domainIncludes: { "@id": "schema:File" },
                    inverseOf: "",
                    rangeIncludes: { "@id": "pcdm:Object" },
                    "rdfs:comment": "Links from a File to its containing Object.",
                    "rdfs:label": "fileOf",
                    "@reverse": { mentions: { "@id": "./" } },
                },
            ],
        };

        crate = expandIdentifiers({ crate });
        expect(crate["@graph"][2]["@id"]).toEqual("https://pcdm.org/models#Collection");
        expect(crate["@graph"][3]["@id"]).toEqual("https://pcdm.org/models#fileOf");
    });

    it(`should be able to extract all classes and properties from the crate`, async () => {
        let crate = {
            "@context": {
                pcdm: "http://pcdm.org/models#",
                rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                rdfs: "http://www.w3.org/2000/01/rdf-schema#",
                schema: "http://schema.org/",
                bio: "https://bioschemas.org/",
                mentions: "http://schema.org/mentions",
                label: "http://www.w3.org/2000/01/rdf-schema#label",
            },
            "@graph": [
                {
                    "@id": "ro-crate-metadata.json",
                    "@type": "CreativeWork",
                    conformsTo: { "@id": "https://w3id.org/ro/crate/1.1" },
                    about: { "@id": "./" },
                    name: "ro-crate-metadata.json",
                    "@reverse": {},
                },
                {
                    "@id": "./",
                    "@type": "Dataset",
                    name: "My Research Object Crate",
                    "@reverse": { about: { "@id": "ro-crate-metadata.json" } },
                    mentions: [
                        { "@id": "pcdm:Collection" },
                        { "@id": "pcdm:Object" },
                        { "@id": "bio:ComputationalWorkflow" },
                        { "@id": "bio:FormalParameter" },
                        { "@id": "pcdm:fileOf" },
                        { "@id": "pcdm:hasFile" },
                        { "@id": "pcdm:hasMember" },
                        { "@id": "pcdm:memberOf" },
                        { "@id": "schema:resultOf" },
                        { "@id": "bio:ComputationalWorkflow#input" },
                        { "@id": "bio:ComputationalWorkflow#output" },
                    ],
                },
                {
                    "@id": "pcdm:Collection",
                    "@type": "rdfs:Class",
                    name: "Collection",
                    "rdfs:comment":
                        "A Collection is a group of resources. Collections have descriptive metadata, access metadata, and may links to works and/or collections. By default, member works and collections are an",
                    "rdfs:label": "Collection",
                    "rdfs:subClassOf": { "@id": "schema:Thing" },
                    "@reverse": {
                        mentions: { "@id": "./" },
                        domainIncludes: [{ "@id": "pcdm:hasMember" }, { "@id": "pcdm:memberOf" }],
                        rangeIncludes: [{ "@id": "pcdm:hasMember" }, { "@id": "pcdm:memberOf" }],
                    },
                },
                {
                    "@id": "pcdm:fileOf",
                    "@type": "rdf:Property",
                    name: "fileOf",
                    "schema:domainIncludes": { "@id": "schema:File" },
                    inverseOf: "",
                    "schema:rangeIncludes": { "@id": "pcdm:Object" },
                    "rdfs:comment": "Links from a File to its containing Object.",
                    "rdfs:label": "fileOf",
                    "@reverse": { mentions: { "@id": "./" } },
                },
            ],
        };

        // crate = expandIdentifiers({ crate });

        const classes = extractClasses({ crate });
        expect(classes.length).toEqual(1);

        const properties = extractProperties({ crate });
        expect(properties.length).toEqual(1);
    });

    it(`should be able to join the classes defined in the extension file into the schema.org tree`, async () => {
        let definitions = await createDescriboMainProfile();
        expect(
            definitions["CreativeWork"].inputs.filter((i) => i.name === "hasPart")[0]
        ).toMatchObject({
            id: "https://schema.org/hasPart",
            name: "hasPart",
            type: [
                "ANY",
                "CreativeWork",
                "Dataset",
                "File",
                "RepositoryCollection",
                "RepositoryObject",
            ],
        });

        expect(
            definitions["CreativeWork"].inputs.filter((i) => i.name === "temporal")[0]
        ).toMatchObject({
            id: "https://schema.org/temporal",
            name: "temporal",
            type: ["TextArea", "DateTime"],
        });

        expect(
            definitions["Thing"].inputs.filter((i) => i.name === "description")[0]
        ).toMatchObject({
            id: "https://schema.org/description",
            name: "description",
            type: ["TextArea", "TextObject"],
        });
    });
});
