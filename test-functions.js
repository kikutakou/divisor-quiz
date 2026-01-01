import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getDivisorPairs, generateAnswerNumber, generateWrongChoices, PRIMES } from './quiz-logic.js';

describe('getDivisorPairs', () => {
    test('all pairs multiply to the original number for 1-400', () => {
        for (let n = 1; n <= 400; n++) {
            const pairs = getDivisorPairs(n);
            for (const [a, b] of pairs) {
                assert.strictEqual(a * b, n, `Pair [${a}, ${b}] does not multiply to ${n}`);
            }
        }
    });

    test('no duplicate pairs exist', () => {
        for (let n = 1; n <= 400; n++) {
            const pairs = getDivisorPairs(n);
            const seen = new Set();
            for (const [a, b] of pairs) {
                const normalized = a <= b ? `${a},${b}` : `${b},${a}`;
                assert.ok(!seen.has(normalized), `Duplicate pair [${a}, ${b}] found for ${n}`);
                seen.add(normalized);
            }
        }
    });

    test('returns non-empty pairs for all numbers 4-400', () => {
        for (let n = 4; n <= 400; n++) {
            const pairs = getDivisorPairs(n);
            assert.ok(pairs.length > 0, `Number ${n} has empty pairs`);
        }
    });
});

describe('generateAnswerNumber', () => {
    test('always returns numbers with non-empty divisor pairs in 1000 iterations', () => {
        for (let i = 0; i < 1000; i++) {
            const n = generateAnswerNumber();
            const pairs = getDivisorPairs(n);
            assert.ok(pairs.length > 0, `Generated number ${n} has empty pairs`);
        }
    });

    test('always returns numbers <= max_number (150) in 1000 iterations', () => {
        const max_number = 150;
        for (let i = 0; i < 1000; i++) {
            const n = generateAnswerNumber(max_number);
            assert.ok(n <= max_number, `Generated number ${n} exceeds max_number ${max_number}`);
        }
    });
});

describe('generateWrongChoices', () => {
    test('returns exactly 3 wrong choices for all numbers 1-400', () => {
        for (let n = 1; n <= 400; n++) {
            const wrongChoices = generateWrongChoices(n);
            assert.strictEqual(wrongChoices.length, 3, `Number ${n} got ${wrongChoices.length} choices instead of 3`);
        }
    });

    test('wrong choices do not contain correct pairs', () => {
        for (let n = 1; n <= 100; n++) {
            const correctPairs = getDivisorPairs(n);
            const wrongChoices = generateWrongChoices(n);
            for (const wrong of wrongChoices) {
                const isCorrect = correctPairs.some(
                    pair => pair[0] === wrong[0] && pair[1] === wrong[1]
                );
                assert.ok(!isCorrect, `Wrong choice [${wrong}] is actually correct for ${n}`);
            }
        }
    });

    test('wrong choices have no duplicates', () => {
        for (let n = 1; n <= 100; n++) {
            const wrongChoices = generateWrongChoices(n);
            const serialized = wrongChoices.map(c => JSON.stringify(c));
            const unique = new Set(serialized);
            assert.strictEqual(unique.size, wrongChoices.length, `Duplicate wrong choices for ${n}: ${JSON.stringify(wrongChoices)}`);
        }
    });
});
