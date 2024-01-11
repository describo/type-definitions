module.exports = {
    // the name of the schema.org jsonld file - expected to be in this folder
    schema: "schema.org.jsonld",

    // the name of the ro crate context - expected to be in this folder
    crateContext: "rocrate.jsonld",

    // simple data types - ie not entities
    simpleDataTypes: ["Text", "Date", "DateTime", "Time", "Number", "Float", "Integer"],

    // classes to be mapped to a switch
    selectDataTypes: ["Boolean"],

    // rules for renaming properties and classes
    //   this happens after the datastructure has been assembled
    rename: {
        classes: {
            MediaObject: "File",
            Periodical: "Journal",
            "models#Object": "RepositoryObject",
            "models#Collection": "RepositoryCollection",
        },
        properties: {
            "models#hasMember": "hasMember",
            "models#hasFile": "hasFile",
        },
    },

    // extra properties to be added to specific classes
    addPropertyToClasses: {
        hasPart: {
            classes: [
                "Dataset",
                "File",
                "File, ImageObject",
                "File, SoftwareSourceCode",
                "File, SoftwareSourceCode, ComputationalWorkflow",
                "RepositoryCollection",
                "RepositoryObject",
                "RepositoryObject, ImageObject",
                "ComputerLanguage, SoftwareApplication",
                "FormalParameter",
                "Thing",
            ],
        },
    },

    // special compound class definitions
    compoundClasses: [
        "File, ImageObject",
        "File, SoftwareSourceCode",
        "RepositoryObject, ImageObject",
        "ComputerLanguage, SoftwareApplication",
        "File, SoftwareSourceCode, ComputationalWorkflow",
    ],
};
