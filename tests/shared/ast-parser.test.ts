import { describe, expect, it } from "bun:test"
import * as fs from "fs"
import * as path from "path"
import {
  analyzeFile,
  analyzeDirectory,
  findCircularDependencies,
  type AstAnalysis,
} from "../../src/shared/ast-parser"

const testDir = path.join(import.meta.dir, "__test-fixtures__")

function createTestFile(name: string, content: string): string {
  fs.mkdirSync(testDir, { recursive: true })
  const filePath = path.join(testDir, name)
  fs.writeFileSync(filePath, content, "utf-8")
  return filePath
}

function cleanupTestDir() {
  fs.rmSync(testDir, { recursive: true, force: true })
}

describe("AST Parser", () => {
  it("analyzes imports", () => {
    const filePath = createTestFile("imports.ts", `
      import { foo, bar } from "./module"
      import defaultExport from "external"
      import type { Type } from "./types"
    `)
    try {
      const analysis = analyzeFile(filePath)
      expect(analysis.imports.length).toBe(3)
      expect(analysis.imports[0].moduleSpecifier).toBe("./module")
      expect(analysis.imports[0].namedImports).toEqual(["foo", "bar"])
      expect(analysis.imports[1].defaultImport).toBe("defaultExport")
      expect(analysis.imports[2].isTypeOnly).toBe(true)
    } finally {
      cleanupTestDir()
    }
  })

  it("analyzes exports", () => {
    const filePath = createTestFile("exports.ts", `
      export function myFunc() {}
      export class MyClass {}
      export interface MyInterface {}
      export type MyType = string
      export const myVar = 42
    `)
    try {
      const analysis = analyzeFile(filePath)
      expect(analysis.exports.length).toBe(5)
      expect(analysis.exports[0].name).toBe("myFunc")
      expect(analysis.exports[0].kind).toBe("function")
      expect(analysis.exports[1].name).toBe("MyClass")
      expect(analysis.exports[1].kind).toBe("class")
    } finally {
      cleanupTestDir()
    }
  })

  it("analyzes classes", () => {
    const filePath = createTestFile("classes.ts", `
      abstract class Base {
        protected name: string
        abstract calculate(): number
      }
      class Derived extends Base implements Serializable {
        private value: number
        calculate(): number { return this.value }
        serialize(): string { return "" }
      }
    `)
    try {
      const analysis = analyzeFile(filePath)
      expect(analysis.classes.length).toBe(2)
      expect(analysis.classes[0].isAbstract).toBe(true)
      expect(analysis.classes[1].extends).toBe("Base")
      expect(analysis.classes[1].implements).toEqual(["Serializable"])
      expect(analysis.classes[1].methods).toContain("calculate")
      expect(analysis.classes[1].methods).toContain("serialize")
    } finally {
      cleanupTestDir()
    }
  })

  it("analyzes error classes", () => {
    const filePath = createTestFile("errors.ts", `
      class AppError extends Error {
        code: string
        context?: Record<string, unknown>
      }
      class CustomError extends Error {
        constructor(message: string) { super(message) }
      }
    `)
    try {
      const analysis = analyzeFile(filePath)
      expect(analysis.errorClasses.length).toBe(2)
      expect(analysis.errorClasses[0].name).toBe("AppError")
      expect(analysis.errorClasses[0].extends).toBe("Error")
      expect(analysis.errorClasses[0].hasCode).toBe(true)
      expect(analysis.errorClasses[0].hasContext).toBe(true)
    } finally {
      cleanupTestDir()
    }
  })

  it("analyzes functions", () => {
    const filePath = createTestFile("functions.ts", `
      export async function fetchData(url: string): Promise<Response> {
        return fetch(url)
      }
      function* generator() {
        yield 1
      }
    `)
    try {
      const analysis = analyzeFile(filePath)
      expect(analysis.functions.length).toBe(2)
      expect(analysis.functions[0].isAsync).toBe(true)
      expect(analysis.functions[0].isExported).toBe(true)
      expect(analysis.functions[0].returnType).toBe("Promise<Response>")
      expect(analysis.functions[1].isGenerator).toBe(true)
    } finally {
      cleanupTestDir()
    }
  })

  it("analyzes interfaces", () => {
    const filePath = createTestFile("interfaces.ts", `
      interface Base {
        id: number
        getName(): string
      }
      interface Extended extends Base {
        value: string
      }
    `)
    try {
      const analysis = analyzeFile(filePath)
      expect(analysis.interfaces.length).toBe(2)
      expect(analysis.interfaces[0].properties).toContain("id")
      expect(analysis.interfaces[0].methods).toContain("getName")
      expect(analysis.interfaces[1].extends).toContain("Base")
    } finally {
      cleanupTestDir()
    }
  })

  it("analyzes directory", () => {
    const filePath = createTestFile("dir-test.ts", `
      export const x = 1
    `)
    try {
      const analyses = analyzeDirectory(testDir)
      expect(analyses.length).toBeGreaterThanOrEqual(1)
      expect(analyses[0].filePath).toBe(filePath)
    } finally {
      cleanupTestDir()
    }
  })

  it("finds circular dependencies", () => {
    const fileA = createTestFile("a.ts", `
      import { b } from "./b"
      export const a = 1
    `)
    const fileB = createTestFile("b.ts", `
      import { a } from "./a"
      export const b = 2
    `)
    try {
      const analyses = [analyzeFile(fileA), analyzeFile(fileB)]
      const circular = findCircularDependencies(analyses)
      expect(circular.length).toBeGreaterThan(0)
    } finally {
      cleanupTestDir()
    }
  })

  it("handles files that can't be parsed", () => {
    const filePath = createTestFile("bad.ts", `
      this is not valid typescript {{{
    `)
    try {
      const analysis = analyzeFile(filePath)
      expect(analysis).toBeDefined()
      expect(analysis.imports).toEqual([])
    } finally {
      cleanupTestDir()
    }
  })
})
