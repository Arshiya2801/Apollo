// Maps Apollo's frontend language values to Judge0 CE language IDs.
// Full list: https://ce.judge0.com/languages
// Add new languages here as Apollo expands.

const LANGUAGE_MAP = {
  javascript: { id: 63,  name: 'JavaScript (Node.js 12.14.0)' },
  python:     { id: 71,  name: 'Python (3.8.1)'               },
  java:       { id: 62,  name: 'Java (OpenJDK 13.0.1)'        },
  cpp:        { id: 54,  name: 'C++ (GCC 9.2.0)'              },
};

export default LANGUAGE_MAP;
