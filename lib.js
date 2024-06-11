import { readJSON, pathExists } from "fs-extra/esm";
import { readdir } from "fs/promises";
import path from "path";
import orderBy from "lodash-es/orderBy.js";
import isArray from "lodash-es/isArray.js";
import isPlainObject from "lodash-es/isPlainObject.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import uniq from "lodash-es/uniq.js";
import compact from "lodash-es/compact.js";
import flattenDeep from "lodash-es/flattenDeep.js";
import * as configuration from "./configuration.js";

export async function createDescriboMainProfile() {
    // load the schema.org json-ld file
    if (!(await pathExists("./schema.org.jsonld"))) {
        throw new Error(`schema.org.jsonld file not found`);
    }

    // get all the classes and all of the properties defined in the file
    let schema = await readJSON("./schema.org.jsonld");
    let crate = normaliseEntities({ crate: schema });
    crate = expandIdentifiers({ crate: schema });

    let classes = extractClasses({ crate });
    let properties = extractProperties({ crate });
    let enumerations = extractOtherDefinitions({ crate });

    // console.log("PROPERTY", properties.filter((p) => p.name === "studyDesign")[0]);
    // console.log(properties.slice(0, 3));

    // join in all of the extension data
    for (let extension of await readdir("./schema.org-extensions")) {
        if (extension === ".DS_Store") continue;
        let crate = await readExtension({ name: extension });
        crate = normaliseEntities({ crate });
        crate = expandIdentifiers({ crate });

        classes = classes.concat(extractClasses({ crate }));
        // console.log(extractProperties({ crate }));
        properties = properties.concat(extractProperties({ crate }));
    }

    // process all of the schema.org and extension class definitions
    let definitions = {};
    for (let c of classes) {
        // how does this work?
        //   schema.org classes come first
        //   and extensions are joined in
        //   as the extensions need to replicate some schema.org classes as the join point
        //     in that case, we don't add those otherwise we'd overwrite the schema.org class
        if (!definitions[c.label]) {
            definitions[c.label] = {
                id: c["@id"],
                name: c.name,
                help: c.comment,
                subClassOf: c.domain,
                inputs: [],
                hierarchy: c.domain,
            };
        }
    }

    // figure out the class hierarchies so Describo can lookup properties
    //  Note that this covers all of the classes defined in schema.org and all of the extensions
    definitions = mapClassHierarchies(definitions);

    //  iterate over all of the properties and join them into their respective classes
    definitions = mapPropertiesToClasses({ definitions, properties, enumerations });
    // console.log(JSON.stringify(definitions["https://schema.org/CreativeWork"], null, 2));

    // rename classes and properties
    definitions = applyMappings({ definitions });

    delete definitions[undefined];
    return definitions;
}

/**
 *
 *  Read the extension file named 'name'
 *
 */
export async function readExtension({ name }) {
    const crateFile = path.join("schema.org-extensions", name, "ro-crate-metadata.json");
    if (!(await pathExists(crateFile))) {
        console.error(`Can't load ${crateFile}. Does it exist?`);
    }
    let crate = await readJSON(path.join("schema.org-extensions", name, "ro-crate-metadata.json"));

    // if we don't fail here then the crate is good
    let rootDataset = getRootDataset({ crate });
    return crate;
}

/**
 *
 * Get the crate's root dataset
 *
 */
export function getRootDataset({ crate }) {
    try {
        let rootDescriptor = crate["@graph"].filter(
            (e) => e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork"
        )[0];
        let rootDataset = crate["@graph"].filter(
            (e) => e["@id"] === rootDescriptor.about["@id"]
        )[0];
        return rootDataset;
    } catch (error) {
        throw new Error(`Can't locate root dataset.`);
    }
}

/**
 *
 * Extract the classes defined in the crate - works on schema.org jsonld too
 *
 */
export function extractClasses({ crate }) {
    let classes = [];
    for (let entity of crate["@graph"]) {
        if (["rdfs:Class"].includes(entity["@type"])) {
            if (!entity.comment) {
                console.log(`WARNING: ${entity.name} does not have a comment (description)`);
            }
            if (!entity.label) {
                console.log(`WARNING: ${entity.name} does not have a label`);
            }
            classes.push(entity);
        }
    }
    return classes;
}

/**
 *
 * Extract the properties defined in the crate - works on schema.org jsonld too
 *
 */
export function extractProperties({ crate }) {
    let properties = [];
    for (let entity of crate["@graph"]) {
        if (["rdf:Property"].includes(entity["@type"])) {
            if (!entity.comment) {
                console.log(`WARNING: ${entity.name} does not have a comment (description)`);
            }
            if (!entity.label) {
                console.log(`WARNING: ${entity.name} does not have a label`);
            }
            properties.push(entity);
        }
    }
    return properties;
}

/**
 *
 * Extract things other than classes and properties defined in the crate - works on schema.org jsonld too
 *
 */
function extractOtherDefinitions({ crate }) {
    let entities = {};
    for (let entity of crate["@graph"]) {
        if (!["rdfs:Class", "rdf:Property"].includes(entity["@type"])) {
            if (isArray(entity["@type"])) continue;
            const name = stripPrefix(entity["@type"]);
            if (!entities[name]) entities[name] = [];
            entities[name].push(entity);
        }
    }
    return entities;
}

/**
 *
 * Expand prefixed identifiers
 *
 */

export function expandIdentifiers({ crate }) {
    const context = crate["@context"];
    let entities = [];
    // for each entity
    for (let entity of crate["@graph"]) {
        entity["@id"] = expand(entity["@id"], context);
        entities.push(entity);
    }
    return { "@context": context, "@graph": entities };
}

/**
 *
 * Normalise the entity definition coming in
 *
 */
export function normaliseEntity(entity) {
    entity.name = stripPrefix(entity["@id"]);
    entity.comment = entity["rdfs:comment"];
    entity.label = entity["rdfs:label"];
    //  clean up prop's which are { @language, @value } format
    if (isPlainObject(entity.label)) {
        entity.label = entity.label["@value"];
    }
    if (isPlainObject(entity.comment)) {
        entity.comment = entity.comment["@value"];
    }
    if (entity["@type"] === "rdfs:Class") {
        if (entity?.["rdfs:subClassOf"]) {
            entity.domain = [].concat(entity["rdfs:subClassOf"]).map((d) => {
                if (d?.["@id"]) return stripPrefix(d["@id"]);
            });
        } else {
            if (entity["@id"] !== "schema:Thing") {
                throw new Error(
                    `Entity definition incorrect. Property 'rdfs:subClassOf' not found.`
                );
            }
        }
    } else if (entity["@type"] === "rdf:Property") {
        if (entity["schema:domainIncludes"]) {
            entity.domain = [].concat(entity["schema:domainIncludes"]).map((d) => {
                if (d?.["@id"]) return stripPrefix(d["@id"]);
            });
        } else {
            throw new Error(
                `Entity definition incorrect. Property 'schema:domainIncludes' not found.`
            );
        }

        if (entity["schema:rangeIncludes"]) {
            entity.range = [].concat(entity["schema:rangeIncludes"]).map((d) => {
                if (d?.["@id"]) return stripPrefix(d["@id"]);
            });
        } else {
            throw new Error(
                `Entity definition incorrect. Property 'schema:rangeIncludes' not found.`
            );
        }
    } else {
        // if (entity["@id"].match(/Diet/)) console.error(entity);
        // throw new Error(`Entity['@type] must be one of rdfs:Class or rdf:Property`);
        // console.llog(`Entity['@type] must be one of rdfs:Class or rdf:Property`);
    }
    return entity;
}

export function normaliseEntities({ crate }) {
    const entities = [];
    let error = false;
    for (let entity of crate["@graph"]) {
        try {
            normaliseEntity(entity);
            entities.push(entity);
        } catch (error) {
            error = true;
        }
    }

    if (error) {
        console.log(
            `There are critical errors in the input datasets that mean this process can't continue`
        );
        process.exit();
    }

    return {
        "@context": crate["@context"],
        "@graph": entities,
    };
}

/**
 *
 * Strip prefix's from id's - works with fully qualified url's and prefix ref's
 */
export function stripPrefix(value) {
    if (value.match(/https?:.*#.*/g)) return value.split("#").pop();
    if (value.match(/https?:.*/g)) return value.split(/\//).pop();
    if (value.match(":")) return value.split(":")[1];
}

/**
 *
 * Expand a prefix ref to the fully qualified url - requires the context
 *
 */
function expand(value, context) {
    if (value.match(/:/)) {
        const [prefix, rest] = value.split(":");
        if (!["http", "https"].includes(prefix)) {
            value = `${context[prefix]}${rest}`;
        }
    }
    return value;
}

/**
 *
 * Figure out class hierarchies
 *
 */

function mapClassHierarchies(classes) {
    Object.keys(classes).forEach((className) => {
        classes[className].hierarchy = uniq(
            compact(flattenDeep([className, getParent(className)])).reverse()
        ).reverse();
    });
    return classes;

    function getParent(className) {
        if (classes[className] && classes[className].subClassOf) {
            return classes[className].subClassOf.map((c) => {
                c = [].concat(c);
                return c?.map((d) => {
                    let parents = [d, getParent(d)];
                    return parents;
                });
            });
        }
    }
}

/**
 *
 * Map properties to entity classes
 *
 */
function mapPropertiesToClasses({ definitions, properties, enumerations }) {
    for (let property of properties) {
        let classDefinition;
        try {
            if (!property.domain) continue;
            for (classDefinition of property.domain) {
                if (!classDefinition) continue;
                const inputDefinition = {
                    id: property["@id"],
                    name: property.name,
                    label: property.label,
                    help: property.comment,
                    required: false,
                    multiple: property["@id"] === "https://schema.org/name" ? false : true,
                    hide: false,
                    readonly: false,
                    type: property.range,
                };

                // remap data types if required
                if (configuration.remap[property["@id"]]) {
                    inputDefinition.type = inputDefinition.type.map((type) => {
                        return configuration.remap[property["@id"]][type] ?? type;
                    });
                }

                // remap all links to Thing to ANY
                inputDefinition.type = flattenDeep(
                    inputDefinition.type.map((type) => (type !== "Thing" ? type : ["Thing", "ANY"]))
                );

                // add extra property targets if defined
                if (configuration.addClassesToProperty[property["@id"]]) {
                    inputDefinition.type = inputDefinition.type
                        .concat(configuration.addClassesToProperty[property["@id"]])
                        .sort();
                }

                // add enumerations as select objects
                let values;
                inputDefinition.type.forEach((type) => {
                    if (enumerations[type]) {
                        values = enumerations[type].map((t) => t["@id"]);
                    }
                });
                if (values) {
                    inputDefinition.type = [...inputDefinition.type, "SelectURL"];
                    inputDefinition.values = values;
                }

                definitions[classDefinition].inputs.push(inputDefinition);
            }
        } catch (error) {
            console.log(property);
            console.log(error);
            if (!property.comment.match(/deprecated/)) {
                console.log("PROPERTY", property);
                console.log("CLASS DEF", classDefinition, definitions[classDefinition]);
            }
        }
    }
    // console.log(JSON.stringify(definitions["CreativeWork"], null, 2));

    //  order the inputs by 'name'
    for (let c of Object.keys(definitions)) {
        definitions[c].inputs = orderBy(definitions[c].inputs, "name");
    }
    return definitions;
}

/**
 *
 * Apply class mappings - e.g. MediaObject -> File
 *
 */
function applyMappings({ definitions }) {
    for (let className of Object.keys(definitions)) {
        const newClassName = configuration.mappings.classes[className];
        if (!newClassName) continue;

        // create the class mappings
        if (configuration.mappings.classes[className]) {
            definitions[newClassName] = cloneDeep(definitions[className]);
            definitions[newClassName].hierarchy = definitions[newClassName].hierarchy.map((h) =>
                h === className ? h.replace(className, newClassName) : h
            );

            definitions[newClassName].name = newClassName;
        }

        // iterate over the properties and map the types there
        definitions[className].inputs = definitions[className].inputs.map((i) => {
            i.type = i.type.map((t) => {
                const mapping = configuration.mappings.classes[t];
                return mapping ? mapping : t;
            });
            i.type = uniq(i.type);
            i.type = i.type.sort();
            return i;
        });

        definitions[newClassName].inputs = definitions[newClassName].inputs.map((i) => {
            i.type = i.type.map((t) => {
                const mapping = configuration.mappings.classes[t];
                return mapping ? mapping : t;
            });
            i.type = uniq(i.type);
            i.type = i.type.sort();
            return i;
        });
    }
    return definitions;
}
