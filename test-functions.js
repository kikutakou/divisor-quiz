import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getDivisorPairs, generateAnswerNumber, generateWrongChoices, CONFIG } from './quiz-logic.js';

describe('getDivisorPairs', () => {
    test('all pairs multiply to the original number and no duplicates exist for 1-400', () => {
        for (let n = 1; n <= 400; n++) {
            const pairs = getDivisorPairs(n);
            const seen = new Set();
            for (const [a, b] of pairs) {
                assert.ok(a <= b, `Pair [${a}, ${b}] should have a <= b for ${n}`);
                assert.notStrictEqual(a, 1, `Pair [${a}, ${b}] should not contain 1 for ${n}`);
                assert.strictEqual(a * b, n, `Pair [${a}, ${b}] does not multiply to ${n}`);
                const key = JSON.stringify([a, b]);
                assert.ok(!seen.has(key), `Duplicate pair [${a}, ${b}] found for ${n}`);
                seen.add(key);
            }
        }
    });
});

describe('generateAnswerNumber', () => {
    test('always returns valid numbers with non-empty divisor pairs and <= max_number in 1000 iterations', () => {
        for (let i = 0; i < 1000; i++) {
            const n = generateAnswerNumber();
            console.log(n);
            const pairs = getDivisorPairs(n);
            assert.ok(pairs.length > 0, `Generated number ${n} is prime (has no valid divisor pairs)`);
            assert.ok(n <= CONFIG.MAX_VALUE, `Generated number ${n} exceeds max_number ${CONFIG.MAX_VALUE}`);
        }
    });
});

describe('generateWrongChoices', () => {
    test('returns exactly 3 unique wrong choices that do not contain correct pairs for 1-100', () => {
        for (let n = 1; n <= 400; n++) {
            const correctPairs = getDivisorPairs(n);
            const wrongChoices = generateWrongChoices(n);

            assert.strictEqual(wrongChoices.length, 3, `Number ${n} got ${wrongChoices.length} choices instead of 3`);

            const wrongSerialized = wrongChoices.map(c => JSON.stringify(c));
            const correctSerialized = correctPairs.map(p => JSON.stringify(p));

            for (const wrongKey of wrongSerialized) {
                const isCorrect = correctSerialized.includes(wrongKey);
                assert.ok(!isCorrect, `Wrong choice ${wrongKey} is actually correct for ${n}`);
            }

            const unique = new Set(wrongSerialized);
            assert.strictEqual(unique.size, wrongChoices.length, `Duplicate wrong choices for ${n}: ${JSON.stringify(wrongChoices)}`);
        }
    });
});
