// remap data types for properties
export const remap = {
    "http://schema.org/description": {
        Text: "TextArea",
        TextObject: "TextArea",
    },
    "http://schema.org/disambiguatingDescription": {
        Text: "TextArea",
    },
    "http://schema.org/abstract": {
        Text: "TextArea",
    },
    "http://schema.org/citation": {
        Text: "TextArea",
    },
    "http://schema.org/comment": {
        Text: "TextArea",
    },
    "http://schema.org/conditionsOfAccess": {
        Text: "TextArea",
    },
    "http://schema.org/creditText": {
        Text: "TextArea",
    },
    "http://schema.org/temporal": {
        Text: "TextArea",
    },
    "http://schema.org/text": {
        Text: "TextArea",
    },
};

// rules for renaming properties and classes
//   this happens after the datastructure has been assembled
export const mappings = {
    classes: {
        MediaObject: "File",
        Periodical: "Journal",
        Object: "RepositoryObject",
        Collection: "RepositoryCollection",
    },
};

export const addClassesToProperty = {
    "https://schema.org/hasPart": [
        "File",
        "Dataset",
        "RepositoryCollection",
        "RepositoryObject",
        "ANY",
    ],
};
