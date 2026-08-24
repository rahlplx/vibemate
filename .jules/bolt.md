## 2025-05-18 - Optimize TypeScript AST creation by disabling parent node link traversal
**Learning:** In the TypeScript Compiler API (`ts.createSourceFile`), specifying `setParentNodes = true` forces TypeScript to recursively set `.parent` pointers on every node in the AST, adding ~25-30% parsing overhead. When AST helpers pass `sourceFile` explicitly to `node.getText(sourceFile)`, parent pointer references are unnecessary.
**Action:** Always set `setParentNodes` to `false` in `ts.createSourceFile` unless `.parent` traversal is explicitly required by the analyzer.
