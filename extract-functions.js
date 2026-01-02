#!/usr/bin/env node
/**
 * Script to extract pure functions (non-DOM touching) from script.js
 * and generate a file that exports them in ES module format
 * 
 * Usage: node extract-pure-functions.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as acorn from 'acorn';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INPUT_FILE = path.join(__dirname, 'docs', 'script.js');
const OUTPUT_FILE = path.join(__dirname, 'quiz-logic.js');

// DOM-related global variables/objects
const DOM_IDENTIFIERS = new Set([
    'document',
    'window',
    'elements',
    'screens',
    'gameState',  // Excluded because game state is linked to DOM operations
]);

// Constant names to exclude (not needed for testing)
const EXCLUDED_CONSTANTS = new Set([
    'gameState',
]);

// Collect function dependencies
function collectFunctionCalls(node, calls = new Set()) {
    if (!node || typeof node !== 'object') return calls;

    // Check for CallExpression (function call)
    if (node.type === 'CallExpression') {
        if (node.callee && node.callee.type === 'Identifier') {
            calls.add(node.callee.name);
        }
    }

    // Recursively check child nodes
    for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        const child = node[key];
        if (Array.isArray(child)) {
            for (const item of child) {
                collectFunctionCalls(item, calls);
            }
        } else if (child && typeof child === 'object' && child.type) {
            collectFunctionCalls(child, calls);
        }
    }

    return calls;
}

// Check if node contains DOM access (recursively traverse AST)
function containsDOMAccess(node) {
    if (!node || typeof node !== 'object') return false;

    // Check Identifier (variable name)
    if (node.type === 'Identifier' && DOM_IDENTIFIERS.has(node.name)) {
        return true;
    }

    // Check MemberExpression (e.g., document.getElementById)
    if (node.type === 'MemberExpression') {
        if (node.object && node.object.type === 'Identifier') {
            if (DOM_IDENTIFIERS.has(node.object.name)) {
                return true;
            }
        }
    }

    // Recursively check child nodes
    for (const key of Object.keys(node)) {
        if (key === 'parent') continue;
        const child = node[key];
        if (Array.isArray(child)) {
            for (const item of child) {
                if (containsDOMAccess(item)) return true;
            }
        } else if (child && typeof child === 'object' && child.type) {
            if (containsDOMAccess(child)) return true;
        }
    }

    return false;
}

// Main processing
function main() {
    // Read source code
    const sourceCode = fs.readFileSync(INPUT_FILE, 'utf-8');

    // Parse to AST
    let ast;
    try {
        ast = acorn.parse(sourceCode, {
            ecmaVersion: 2020,
            sourceType: 'script',
            locations: true
        });
    } catch (e) {
        console.error('Parse error:', e.message);
        process.exit(1);
    }

    // Collect all functions (name -> { node, hasDOMAccess, calls })
    const allFunctions = new Map();

    // Check top-level declarations
    for (const node of ast.body) {
        if (node.type === 'FunctionDeclaration') {
            const funcName = node.id.name;
            allFunctions.set(funcName, {
                node,
                code: sourceCode.slice(node.start, node.end),
                hasDOMAccess: containsDOMAccess(node.body),
                calls: collectFunctionCalls(node.body)
            });
        }
    }

    // Resolve dependencies and exclude functions that indirectly contain DOM operations
    // Cache results for efficiency
    const purityCache = new Map();
    
    function isPure(funcName, visited = new Set()) {
        // Check cache
        if (purityCache.has(funcName)) {
            return purityCache.get(funcName);
        }
        
        if (visited.has(funcName)) return true; // Avoid circular references
        visited.add(funcName);

        const func = allFunctions.get(funcName);
        if (!func) return true; // External functions are considered pure (e.g., Math.random)
        
        if (func.hasDOMAccess) {
            purityCache.set(funcName, false);
            return false;
        }

        // Check called functions
        for (const calledFunc of func.calls) {
            if (allFunctions.has(calledFunc)) {
                if (!isPure(calledFunc, new Set(visited))) {
                    purityCache.set(funcName, false);
                    return false;
                }
            }
        }

        purityCache.set(funcName, true);
        return true;
    }

    // Extract pure functions
    const pureFunctions = [];
    for (const [funcName, func] of allFunctions) {
        if (isPure(funcName)) {
            pureFunctions.push({
                name: funcName,
                code: func.code
            });
            console.log(`[EXTRACTED] Pure function: ${funcName}`);
        } else {
            console.log(`[SKIPPED]   Has DOM access: ${funcName}`);
        }
    }

    // Extract pure constants
    const pureConstants = [];
    for (const node of ast.body) {
        if (node.type === 'VariableDeclaration' && node.kind === 'const') {
            for (const decl of node.declarations) {
                if (decl.id.type === 'Identifier') {
                    const constName = decl.id.name;

                    // Skip if in exclusion list
                    if (EXCLUDED_CONSTANTS.has(constName)) {
                        console.log(`[SKIPPED]   Excluded constant: ${constName}`);
                        continue;
                    }

                    // Extract only if not a reference to DOM elements
                    if (!containsDOMAccess(decl.init)) {
                        // Extract array, object, and literal constants
                        const allowedTypes = ['ArrayExpression', 'ObjectExpression', 'Literal'];
                        if (decl.init && allowedTypes.includes(decl.init.type)) {
                            pureConstants.push({
                                name: constName,
                                code: sourceCode.slice(node.start, node.end)
                            });
                            console.log(`[EXTRACTED] Pure constant: ${constName}`);
                        }
                    } else {
                        console.log(`[SKIPPED]   Has DOM reference: ${constName}`);
                    }
                }
            }
        }
    }

    // Output in ES module format
    let output = `// This file was auto-generated by extract-pure-functions.js
// Source file: docs/script.js
// Generated at: ${new Date().toISOString()}

`;

    // Output constants
    for (const constant of pureConstants) {
        output += `export ${constant.code}\n\n`;
    }

    // Output functions
    for (const func of pureFunctions) {
        output += `export ${func.code}\n\n`;
    }

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

    console.log('');
    console.log('='.repeat(50));
    console.log(`Extraction complete!`);
    console.log(`   Extracted functions: ${pureFunctions.length}`);
    console.log(`   Extracted constants: ${pureConstants.length}`);
    console.log(`   Output file: ${OUTPUT_FILE}`);
}

main();
