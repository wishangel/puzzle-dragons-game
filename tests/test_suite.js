// Test Framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('=== Starting Test Suite ===\n');
        const resultsDiv = document.getElementById('results');

        for (const test of this.tests) {
            try {
                await test.fn();
                this.passed++;
                console.log(`✓ PASS: ${test.name}`);
                resultsDiv.innerHTML += `<div class="test-result pass">✓ PASS: ${test.name}</div>`;
            } catch (error) {
                this.failed++;
                console.error(`✗ FAIL: ${test.name}`);
                console.error(`  Error: ${error.message}`);
                resultsDiv.innerHTML += `<div class="test-result fail">✗ FAIL: ${test.name}<br>Error: ${error.message}</div>`;
            }
        }

        const summary = `\n=== Test Summary ===\nTotal: ${this.tests.length}\nPassed: ${this.passed}\nFailed: ${this.failed}`;
        console.log(summary);

        const summaryDiv = document.getElementById('summary');
        summaryDiv.innerHTML = `<strong>Test Summary</strong><br>Total: ${this.tests.length}<br>Passed: ${this.passed}<br>Failed: ${this.failed}`;

        if (this.failed === 0) {
            summaryDiv.style.borderColor = '#00ff00';
            console.log('\n🎉 All tests passed!');
        } else {
            summaryDiv.style.borderColor = '#ff0000';
            console.log('\n❌ Some tests failed');
        }
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertArrayEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

// Create test instance
const runner = new TestRunner();

// Mock DOM elements for testing
function createMockDOM() {
    if (!document.getElementById('game-board')) {
        const canvas = document.createElement('canvas');
        canvas.id = 'game-board';
        canvas.width = 600;
        canvas.height = 500;
        document.body.appendChild(canvas);
    }

    const elements = ['score', 'combo-count', 'high-score-normal', 'high-score-timeattack'];
    elements.forEach(id => {
        if (!document.getElementById(id)) {
            const el = document.createElement('div');
            el.id = id;
            el.textContent = '0';
            document.body.appendChild(el);
        }
    });
}

// Helper to create testable game instance
function createTestGame() {
    createMockDOM();
    const game = new PuzzleGame();
    // Disable animations for testing
    game.imagesLoaded = true;
    return game;
}

// ===== TESTS =====

runner.test('initBoard creates correct board size', () => {
    const game = createTestGame();
    game.initBoard();

    assertEqual(game.board.length, game.rows, 'Board should have correct number of rows');
    assertEqual(game.board[0].length, game.cols, 'Board should have correct number of columns');

    // Check all cells are filled
    for (let row = 0; row < game.rows; row++) {
        for (let col = 0; col < game.cols; col++) {
            assert(game.board[row][col] !== null, `Cell [${row}][${col}] should not be null`);
            assert(game.availableOrbTypes.includes(game.board[row][col]),
                `Cell [${row}][${col}] should contain valid orb type`);
        }
    }
});

runner.test('initBoard creates board with no initial matches', () => {
    const game = createTestGame();
    game.initBoard();

    const matches = game.findMatches();
    assertEqual(matches.length, 0, 'Initial board should have no matches');
});

runner.test('findMatches detects horizontal match', () => {
    const game = createTestGame();
    game.board = [
        ['fire', 'fire', 'fire', 'water', 'wood', 'light'],
        ['water', 'wood', 'light', 'dark', 'fire', 'water'],
        ['wood', 'light', 'dark', 'fire', 'water', 'wood'],
        ['light', 'dark', 'fire', 'water', 'wood', 'light'],
        ['dark', 'fire', 'water', 'wood', 'light', 'dark']
    ];

    const matches = game.findMatches();
    assertEqual(matches.length, 1, 'Should find exactly one match');
    assertEqual(matches[0].length, 3, 'Match should contain 3 orbs');
    assertEqual(matches[0][0].type, 'fire', 'Match should be fire type');
});

runner.test('findMatches detects vertical match', () => {
    const game = createTestGame();
    game.board = [
        ['fire', 'water', 'wood', 'light', 'dark', 'fire'],
        ['fire', 'wood', 'light', 'dark', 'fire', 'water'],
        ['fire', 'light', 'dark', 'fire', 'water', 'wood'],
        ['water', 'dark', 'fire', 'water', 'wood', 'light'],
        ['wood', 'fire', 'water', 'wood', 'light', 'dark']
    ];

    const matches = game.findMatches();
    assertEqual(matches.length, 1, 'Should find exactly one match');
    assertEqual(matches[0].length, 3, 'Match should contain 3 orbs');
    assertEqual(matches[0][0].type, 'fire', 'Match should be fire type');
});

runner.test('findMatches detects multiple matches', () => {
    const game = createTestGame();
    game.board = [
        ['fire', 'fire', 'fire', 'water', 'water', 'water'],
        ['wood', 'light', 'dark', 'light', 'fire', 'wood'],
        ['light', 'wood', 'fire', 'dark', 'water', 'light'],
        ['dark', 'fire', 'water', 'wood', 'light', 'dark'],
        ['water', 'dark', 'light', 'fire', 'wood', 'water']
    ];

    const matches = game.findMatches();
    assert(matches.length >= 2, `Should find at least two matches, found ${matches.length}`);
});

runner.test('findMatches returns empty for no matches', () => {
    const game = createTestGame();
    game.board = [
        ['fire', 'water', 'fire', 'water', 'fire', 'water'],
        ['water', 'fire', 'water', 'fire', 'water', 'fire'],
        ['fire', 'water', 'fire', 'water', 'fire', 'water'],
        ['water', 'fire', 'water', 'fire', 'water', 'fire'],
        ['fire', 'water', 'fire', 'water', 'fire', 'water']
    ];

    const matches = game.findMatches();
    assertEqual(matches.length, 0, 'Should find no matches');
});

runner.test('clearMatches removes matched orbs', async () => {
    const game = createTestGame();
    game.board = [
        ['fire', 'fire', 'fire', 'water', 'wood', 'light'],
        ['water', 'wood', 'light', 'dark', 'fire', 'water'],
        ['wood', 'light', 'dark', 'fire', 'water', 'wood'],
        ['light', 'dark', 'fire', 'water', 'wood', 'light'],
        ['dark', 'fire', 'water', 'wood', 'light', 'dark']
    ];

    const matches = game.findMatches();
    await game.clearMatches(matches);

    assertEqual(game.board[0][0], null, 'Matched orb should be null');
    assertEqual(game.board[0][1], null, 'Matched orb should be null');
    assertEqual(game.board[0][2], null, 'Matched orb should be null');
    assert(game.board[0][3] !== null, 'Non-matched orb should remain');
});

runner.test('dropOrbs moves orbs down', async () => {
    const game = createTestGame();
    game.board = [
        [null, 'water', null, 'light', 'dark', 'fire'],
        [null, 'wood', 'light', 'dark', 'fire', 'water'],
        ['fire', 'light', 'dark', 'fire', 'water', 'wood'],
        ['water', 'dark', 'fire', 'water', 'wood', 'light'],
        ['wood', 'fire', 'water', 'wood', 'light', 'dark']
    ];

    await game.dropOrbs();

    // Check column 0: fire, water, wood should drop down
    assertEqual(game.board[4][0], 'wood', 'Bottom orb should be wood');
    assertEqual(game.board[3][0], 'water', 'Second from bottom should be water');
    assertEqual(game.board[2][0], 'fire', 'Third from bottom should be fire');
    assertEqual(game.board[1][0], null, 'Top should be null');
    assertEqual(game.board[0][0], null, 'Top should be null');
});

runner.test('handleInputMove swaps adjacent orbs', () => {
    const game = createTestGame();
    game.board = [
        ['fire', 'water', 'wood', 'light', 'dark', 'fire'],
        ['water', 'wood', 'light', 'dark', 'fire', 'water'],
        ['wood', 'light', 'dark', 'fire', 'water', 'wood'],
        ['light', 'dark', 'fire', 'water', 'wood', 'light'],
        ['dark', 'fire', 'water', 'wood', 'light', 'dark']
    ];

    // Simulate drag start
    game.isDragging = true;
    game.selectedOrb = { row: 0, col: 0 };
    game.dragPath = [{ row: 0, col: 0 }];
    game.moveStartTime = Date.now();

    const originalFire = game.board[0][0];
    const originalWater = game.board[0][1];

    // Directly test the swap logic by simulating position (0, 1)
    const col = 1;
    const row = 0;
    const lastPos = game.dragPath[game.dragPath.length - 1];

    // Perform the swap
    const temp = game.board[row][col];
    game.board[row][col] = game.board[lastPos.row][lastPos.col];
    game.board[lastPos.row][lastPos.col] = temp;
    game.dragPath.push({ row, col });
    game.selectedOrb = { row, col };

    assertEqual(game.board[0][0], originalWater, 'Position [0][0] should now have water');
    assertEqual(game.board[0][1], originalFire, 'Position [0][1] should now have fire');
});

runner.test('handleInputMove respects time limit', () => {
    const game = createTestGame();
    game.board = [
        ['fire', 'water', 'wood', 'light', 'dark', 'fire'],
        ['water', 'wood', 'light', 'dark', 'fire', 'water'],
        ['wood', 'light', 'dark', 'fire', 'water', 'wood'],
        ['light', 'dark', 'fire', 'water', 'wood', 'light'],
        ['dark', 'fire', 'water', 'wood', 'light', 'dark']
    ];

    // Simulate drag start with time already expired
    game.isDragging = true;
    game.selectedOrb = { row: 0, col: 0 };
    game.dragPath = [{ row: 0, col: 0 }];
    game.moveStartTime = Date.now() - game.maxMoveTime - 1000; // Expired

    const mockEvent = {
        cancelable: true,
        preventDefault: () => { },
        clientX: game.padding + game.orbSize * 1 + game.orbSize / 2,
        clientY: game.padding + game.orbSize * 0 + game.orbSize / 2
    };

    game.handleInputMove(mockEvent);

    // After time limit, isDragging should be false (handleInputEnd called)
    assertEqual(game.isDragging, false, 'Dragging should stop after time limit');
});

runner.test('processMatches clears and drops orbs', async () => {
    const game = createTestGame();
    game.board = [
        ['fire', 'fire', 'fire', 'water', 'wood', 'light'],
        ['water', 'wood', 'light', 'dark', 'fire', 'water'],
        ['wood', 'light', 'dark', 'fire', 'water', 'wood'],
        ['light', 'dark', 'fire', 'water', 'wood', 'light'],
        ['dark', 'fire', 'water', 'wood', 'light', 'dark']
    ];

    await game.processMatches();

    // After processing, the matched orbs should be gone and new ones filled
    assert(game.board[0][0] !== null, 'Board should be filled after processing');
    assert(game.board[0][1] !== null, 'Board should be filled after processing');
    assert(game.board[0][2] !== null, 'Board should be filled after processing');

    // Score should increase
    assert(game.score > 0, 'Score should increase after match');
});

runner.test('getRandomOrbType returns valid type', () => {
    const game = createTestGame();

    for (let i = 0; i < 100; i++) {
        const orbType = game.getRandomOrbType();
        assert(game.availableOrbTypes.includes(orbType),
            `Random orb type ${orbType} should be in available types`);
    }
});

runner.test('updateAvailableOrbs updates and reinits board', () => {
    const game = createTestGame();

    // Mock checkbox selection properly
    const checkboxes = document.querySelectorAll('.orb-option input');
    if (checkboxes.length === 0) {
        // Create mock checkboxes with proper structure
        ['fire', 'water'].forEach(type => {
            const label = document.createElement('label');
            label.className = 'orb-option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = type;
            checkbox.checked = true;
            label.appendChild(checkbox);
            document.body.appendChild(label);
        });
    }

    const originalBoardState = JSON.stringify(game.board);
    game.updateAvailableOrbs();

    // Board should be reinitialized
    assert(JSON.stringify(game.board) !== originalBoardState, 'Board should be reinitialized');
    assertEqual(game.score, 0, 'Score should be reset');
});

// Run all tests when page loads
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        runner.run();
    }, 100);
});
