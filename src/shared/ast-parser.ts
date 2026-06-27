import * as ts from "typescript"
import * as fs from "fs"
import * as path from "path"

export interface AstAnalysis {
  filePath: string
  imports: ImportInfo[]
  exports: ExportInfo[]
  classes: ClassInfo[]
  functions: FunctionInfo[]
  interfaces: InterfaceInfo[]
  typeAliases: TypeInfo[]
  errorClasses: ErrorClassInfo[]
  circularDeps: string[][]
}

export interface ImportInfo {
  moduleSpecifier: string
  namedImports: string[]
  defaultImport: string | null
  isTypeOnly: boolean
}

export interface ExportInfo {
  name: string
  kind: "function" | "class" | "interface" | "type" | "variable"
  isDefault: boolean
  isReExport: boolean
}

export interface ClassInfo {
  name: string
  extends: string | null
  implements: string[]
  methods: string[]
  properties: string[]
  isAbstract: boolean
  decorators: string[]
}

export interface FunctionInfo {
  name: string
  parameters: string[]
  returnType: string | null
  isAsync: boolean
  isGenerator: boolean
  isExported: boolean
}

export interface InterfaceInfo {
  name: string
  extends: string[]
  properties: string[]
  methods: string[]
}

export interface TypeInfo {
  name: string
  typeParameters: string[]
}

export interface ErrorClassInfo {
  name: string
  extends: string | null
  hasCode: boolean
  hasContext: boolean
}

export function analyzeFile(filePath: string): AstAnalysis {
  const source = fs.readFileSync(filePath, "utf-8")
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true
  )

  const analysis: AstAnalysis = {
    filePath,
    imports: [],
    exports: [],
    classes: [],
    functions: [],
    interfaces: [],
    typeAliases: [],
    errorClasses: [],
    circularDeps: [],
  }

  ts.forEachChild(sourceFile, (node) => {
    visitNode(node, sourceFile, analysis)
  })

  return analysis
}

function visitNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  analysis: AstAnalysis
): void {
  if (ts.isImportDeclaration(node)) {
    analysis.imports.push(extractImport(node))
  } else if (ts.isExportDeclaration(node)) {
    analysis.exports.push(...extractExport(node))
  } else if (ts.isClassDeclaration(node)) {
    const classInfo = extractClass(node)
    if (classInfo) {
      analysis.classes.push(classInfo)
      if (isErrorClass(classInfo)) {
        analysis.errorClasses.push(toErrorClassInfo(classInfo))
      }
      if (hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
        analysis.exports.push({
          name: classInfo.name,
          kind: "class",
          isDefault: hasModifier(node, ts.SyntaxKind.DefaultKeyword),
          isReExport: false,
        })
      }
    }
  } else if (ts.isFunctionDeclaration(node)) {
    const funcInfo = extractFunction(node)
    if (funcInfo) {
      analysis.functions.push(funcInfo)
      if (funcInfo.isExported) {
        analysis.exports.push({
          name: funcInfo.name,
          kind: "function",
          isDefault: hasModifier(node, ts.SyntaxKind.DefaultKeyword),
          isReExport: false,
        })
      }
    }
  } else if (ts.isInterfaceDeclaration(node)) {
    analysis.interfaces.push(extractInterface(node))
    if (hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      analysis.exports.push({
        name: node.name.text,
        kind: "interface",
        isDefault: false,
        isReExport: false,
      })
    }
  } else if (ts.isTypeAliasDeclaration(node)) {
    analysis.typeAliases.push({ name: node.name.text, typeParameters: [] })
    if (hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      analysis.exports.push({
        name: node.name.text,
        kind: "type",
        isDefault: false,
        isReExport: false,
      })
    }
  } else if (ts.isVariableStatement(node)) {
    for (const decl of node.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
        analysis.exports.push({
          name: decl.name.text,
          kind: "variable",
          isDefault: false,
          isReExport: false,
        })
      }
    }
  }

  ts.forEachChild(node, (child) => visitNode(child, sourceFile, analysis))
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  if (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isVariableStatement(node)) {
    return node.modifiers?.some((m) => m.kind === kind) ?? false
  }
  return false
}

function extractImport(node: ts.ImportDeclaration): ImportInfo {
  const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text
  const namedImports: string[] = []
  let defaultImport: string | null = null
  const isTypeOnly = node.importClause?.isTypeOnly ?? false

  if (node.importClause) {
    if (node.importClause.name) {
      defaultImport = node.importClause.name.text
    }
    if (node.importClause.namedBindings) {
      if (ts.isNamedImports(node.importClause.namedBindings)) {
        for (const element of node.importClause.namedBindings.elements) {
          namedImports.push(element.name.text)
        }
      } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
        namedImports.push("*")
      }
    }
  }

  return { moduleSpecifier, namedImports, defaultImport, isTypeOnly }
}

function extractExport(node: ts.ExportDeclaration): ExportInfo[] {
  const exports: ExportInfo[] = []

  if (node.exportClause) {
    if (ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        exports.push({
          name: element.name.text,
          kind: "variable",
          isDefault: false,
          isReExport: !!node.moduleSpecifier,
        })
      }
    }
  } else if (node.moduleSpecifier) {
    exports.push({
      name: "*",
      kind: "variable",
      isDefault: false,
      isReExport: true,
    })
  }

  return exports
}

function extractClass(node: ts.ClassDeclaration): ClassInfo | null {
  if (!node.name) return null

  const extendsClause = node.heritageClauses?.find(
    (c) => c.token === ts.SyntaxKind.ExtendsKeyword
  )
  const implementsClause = node.heritageClauses?.find(
    (c) => c.token === ts.SyntaxKind.ImplementsKeyword
  )

  const methods: string[] = []
  const properties: string[] = []

  for (const member of node.members) {
    if (ts.isMethodDeclaration(member) && member.name) {
      methods.push(member.name.getText())
    } else if (ts.isPropertyDeclaration(member) && member.name) {
      properties.push(member.name.getText())
    }
  }

  return {
    name: node.name.text,
    extends: extendsClause?.types[0]?.expression.getText() ?? null,
    implements: implementsClause?.types.map((t) => t.expression.getText()) ?? [],
    methods,
    properties,
    isAbstract: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword) ?? false,
    decorators: [],
  }
}

function extractFunction(node: ts.FunctionDeclaration): FunctionInfo | null {
  if (!node.name) return null

  return {
    name: node.name.text,
    parameters: node.parameters.map((p) => p.name.getText()),
    returnType: node.type?.getText() ?? null,
    isAsync: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false,
    isGenerator: node.asteriskToken !== undefined,
    isExported: node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false,
  }
}

function extractInterface(node: ts.InterfaceDeclaration): InterfaceInfo {
  const extendsClause = node.heritageClauses?.find(
    (c) => c.token === ts.SyntaxKind.ExtendsKeyword
  )

  const properties: string[] = []
  const methods: string[] = []

  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      properties.push(member.name.getText())
    } else if (ts.isMethodSignature(member) && member.name) {
      methods.push(member.name.getText())
    }
  }

  return {
    name: node.name.text,
    extends: extendsClause?.types.map((t) => t.expression.getText()) ?? [],
    properties,
    methods,
  }
}

function isErrorClass(classInfo: ClassInfo): boolean {
  return (
    classInfo.extends === "Error" ||
    classInfo.extends === "VibemateError" ||
    classInfo.properties.includes("code") ||
    classInfo.properties.includes("context")
  )
}

function toErrorClassInfo(classInfo: ClassInfo): ErrorClassInfo {
  return {
    name: classInfo.name,
    extends: classInfo.extends,
    hasCode: classInfo.properties.includes("code"),
    hasContext: classInfo.properties.includes("context"),
  }
}

export function analyzeDirectory(dir: string): AstAnalysis[] {
  const analyses: AstAnalysis[] = []

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        try {
          analyses.push(analyzeFile(fullPath))
        } catch {
          // Skip files that can't be parsed
        }
      }
    }
  }

  walk(dir)
  return analyses
}

export function findCircularDependencies(analyses: AstAnalysis[]): string[][] {
  const importMap = new Map<string, Set<string>>()
  const fileByModule = new Map<string, string>()

  for (const analysis of analyses) {
    const moduleName = analysis.filePath.replace(/\.tsx?$/, "")
    importMap.set(moduleName, new Set())
    fileByModule.set(moduleName, analysis.filePath)

    for (const imp of analysis.imports) {
      if (imp.moduleSpecifier.startsWith(".")) {
        const resolved = path.resolve(path.dirname(analysis.filePath), imp.moduleSpecifier)
        importMap.get(moduleName)!.add(resolved)
      }
    }
  }

  const circular: string[][] = []
  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(node: string, stack: string[]) {
    if (inStack.has(node)) {
      const cycleStart = stack.indexOf(node)
      circular.push(stack.slice(cycleStart))
      return
    }
    if (visited.has(node)) return

    visited.add(node)
    inStack.add(node)
    stack.push(node)

    for (const dep of importMap.get(node) ?? []) {
      dfs(dep, stack)
    }

    stack.pop()
    inStack.delete(node)
  }

  for (const node of importMap.keys()) {
    dfs(node, [])
  }

  return circular
}
