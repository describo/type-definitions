// remap data types for properties
export const remap = {
    "https://schema.org/description": {
        Text: "TextArea",
    },
    "https://schema.org/disambiguatingDescription": {
        Text: "TextArea",
    },
    "https://schema.org/abstract": {
        Text: "TextArea",
    },
    "https://schema.org/citation": {
        Text: "TextArea",
    },
    "https://schema.org/comment": {
        Text: "TextArea",
    },
    "https://schema.org/conditionsOfAccess": {
        Text: "TextArea",
    },
    "https://schema.org/creditText": {
        Text: "TextArea",
    },
    "https://schema.org/temporal": {
        Text: "TextArea",
    },
    "https://schema.org/text": {
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
