// 固定設定
const MAX_QUESTIONS = 10;
const TIME_LIMIT = 10000; // 1問あたりの制限時間（ミリ秒）

// タイマー関連
let questionTimer = null;
let timerInterval = null;

// ゲーム設定パラメータ（難易度別）
const CONFIGS = [
    // 初級: 小さい数、シンプルな素因数
    {
        name: '初級',
        MAX_PRIME_FACTORS: 5,
        PRIME_WEIGHTS: { 2: 40, 3: 35, 5: 15, 7: 10 },
        STOP_PROBABILITY_TABLE: [
            [0, 20],      // 20未満は続ける
            [0.4, 40],    // 20〜40は40%で停止
            [0.8, 60],    // 40〜60は80%で停止
            [0.95, 80],   // 60〜80は95%で停止
        ],
        MAX_VALUE: 60,
    },
    // 中級: 中程度の難易度
    {
        name: '中級',
        MAX_PRIME_FACTORS: 5,
        PRIME_WEIGHTS: { 2: 30, 3: 30, 5: 15, 7: 15, 11: 5, 13: 5 },
        STOP_PROBABILITY_TABLE: [
            [0, 20],      // 20未満は続ける
            [0.4, 40],    // 20〜40は40%で停止
            [0.8, 60],    // 40〜60は80%で停止
            [0.95, 80],   // 60〜80は95%で停止
        ],
        MAX_VALUE: 100,
    },
    // 上級: 現在の設定
    {
        name: '上級',
        MAX_PRIME_FACTORS: 5,
        PRIME_WEIGHTS: { 2: 25, 3: 25, 5: 8, 7: 12, 11: 3, 13: 2, 17: 1, 19: 1, 23: 1, 29: 1, 31: 1, 37: 1 },
        STOP_PROBABILITY_TABLE: [
            [0, 20],      // 20未満は続ける
            [0.3, 40],    // 20〜40は30%で停止
            [0.7, 60],    // 40〜60は70%で停止
            [0.90, 80],   // 60〜80は90%で停止
            [0.98, 100],  // 80〜100は98%で停止
        ],
        MAX_VALUE: 150,
    },
];

// 現在の設定（デフォルトは初級）
let currentConfig = CONFIGS[0];

// 約数のペアを取得（1を含むペアは除外）
function getDivisorPairs(n) {
    const pairs = [];
    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) {
            pairs.push([i, n / i]);
        }
    }
    return pairs;
}

// 重み付きランダム選択（小さい素数ほど高確率）
function selectWeightedPrime(primeWeights) {
    const primes = Object.keys(primeWeights).map(Number);
    const weights = Object.values(primeWeights);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < primes.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return primes[i];
        }
    }
    return primes[0];
}

// 現在の数値に応じて停止確率を計算
function getStopProbability(value, stopProbabilityTable) {
    const entry = stopProbabilityTable.find(([, threshold]) => value < threshold);
    return entry ? entry[0] : 1.0; // それ以上は100%で停止
}

// クイズの正解となる数を生成（素数を掛け合わせて生成）
function generateAnswerNumber(config = currentConfig) {
    const maxValue = config.MAX_VALUE;
    // 最小素数と最大素数の積がmaxValue以下であることを確認
    // これにより、どの素数からスタートしても少なくとも1つの素数を掛けられることが保証される
    const primes = Object.keys(config.PRIME_WEIGHTS).map(Number);
    const minPrime = Math.min(...primes);
    const maxPrime = Math.max(...primes);
    console.assert(minPrime * maxPrime <= maxValue, `${minPrime} * ${maxPrime} > ${maxValue}`);
    
    let result = selectWeightedPrime(config.PRIME_WEIGHTS);
    const divisors = [result];
    
    while (divisors.length < config.MAX_PRIME_FACTORS) {
        const prime = selectWeightedPrime(config.PRIME_WEIGHTS);
        const newResult = result * prime;
        
        // 上限を超えたら終了
        if (newResult > maxValue) {
            break;
        }
        
        result = newResult;
        divisors.push(result);
        
        // 現在の値に応じて停止するかどうかを判定
        if (Math.random() < getStopProbability(result, config.STOP_PROBABILITY_TABLE)) {
            break;
        }
    }

    if (divisors.length < 2) {
        const prime = [2, 3][Math.floor(Math.random() * 2)];
        result *= prime;
        divisors.push(result);
    }

    return result;
}

// 不正解の選択肢を3つ生成
function generateWrongChoices(targetNumber) {
    // 候補となる数値の配列を生成（3以下とtargetNumberは除外）
    const candidates = [];
    for (let offset = -10; offset <= 10; offset++) {
        const nearbyNumber = targetNumber + offset;
        if (nearbyNumber > 3 && nearbyNumber !== targetNumber) {
            candidates.push(nearbyNumber);
        }
    }
    shuffleArray(candidates);
    // targetNumberが奇数の場合、奇数を優先的に選ぶ
    if (targetNumber % 2 === 1) {
        candidates.sort((a, b) => (a % 2 === 0) - (b % 2 === 0));
    }
    
    // 候補から順に約数ペアを取得
    const wrongChoices = [];
    for (const nearbyNumber of candidates) {
        if (wrongChoices.length >= 3) break;
        
        const pairs = getDivisorPairs(nearbyNumber);
        if (pairs.length === 0) continue;
        
        const selectedPair = pairs[Math.floor(Math.random() * pairs.length)];
        wrongChoices.push(selectedPair);
    }
    
    return wrongChoices;
}

// 選択肢をシャッフル
function shuffleArray(array) {
    const shuffled = array
        .map(value => ({ value, rand: Math.random() }))
        .sort((a, b) => a.rand - b.rand);
    for (let i = 0; i < array.length; i++) {
        array[i] = shuffled[i].value;
    }
    return array;
}

// 新しい問題を生成
function generateQuestion() {
    const number = generateAnswerNumber();
    gameState.currentNumber = number;
    const correctPairs = getDivisorPairs(number);
    
    // 正解の選択肢をランダムに1つ選ぶ
    const correctPair = correctPairs[Math.floor(Math.random() * correctPairs.length)];
    
    // 不正解の選択肢を3つ生成
    const wrongChoices = generateWrongChoices(number);
    
    // 全ての選択肢を作成
    const allChoices = [
        { pair: correctPair, isCorrect: true },
        ...wrongChoices.map(pair => ({ pair, isCorrect: false }))
    ];
    
    return {
        number,
        choices: shuffleArray(allChoices)
    };
}

// ゲームの状態管理
const gameState = {
    correctCount: 0,
    wrongCount: 0,
    totalQuestions: 0,
    currentNumber: 0,
    isAnswering: false,
    history: [], // 問題履歴
    totalTime: 0, // 累計解答時間（ミリ秒）
    questionStartTime: 0 // 問題表示開始時刻
};

// DOM要素
const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen')
};

const elements = {
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn'),
    targetNumber: document.getElementById('target-number'),
    choices: document.getElementById('choices'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    correctCount: document.getElementById('correct-count'),
    wrongCount: document.getElementById('wrong-count'),
    feedback: document.getElementById('feedback'),
    feedbackText: document.getElementById('feedback-text'),
    finalCorrect: document.getElementById('final-correct'),
    finalWrong: document.getElementById('final-wrong'),
    finalRate: document.getElementById('final-rate'),
    finalTime: document.getElementById('final-time'),
    resultMessage: document.getElementById('result-message'),
    history: document.getElementById('history'),
    totalQuestionsInfo: document.getElementById('total-questions-info'),
    difficultyBtns: document.querySelectorAll('.difficulty-btn'),
    timerDisplay: document.getElementById('timer-display')
};

// 画面切り替え
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// UIを更新
function updateUI() {
    elements.correctCount.textContent = gameState.correctCount;
    elements.wrongCount.textContent = gameState.wrongCount;
    
    const progress = (gameState.totalQuestions / MAX_QUESTIONS) * 100;
    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.textContent = `${gameState.totalQuestions} / ${MAX_QUESTIONS}`;
}

// フィードバックを表示
function showFeedback(isCorrect) {
    elements.feedback.classList.remove('correct', 'wrong');
    elements.feedback.classList.add(isCorrect ? 'correct' : 'wrong');
    elements.feedback.classList.add('visible');
    
    if (isCorrect) {
        elements.feedbackText.textContent = '正解！';
    } else {
        elements.feedbackText.textContent = '不正解';
    }
}

// フィードバックを隠す
function hideFeedback() {
    elements.feedback.classList.remove('visible');
}

// タイマーをクリア
function clearQuestionTimer() {
    if (questionTimer) {
        clearTimeout(questionTimer);
        questionTimer = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// タイマー表示を更新
function updateTimerDisplay(remaining) {
    const seconds = Math.ceil(remaining / 1000);
    let timerValue = elements.timerDisplay.querySelector('.timer-value');
    
    if (!timerValue) {
        elements.timerDisplay.innerHTML = `<span class="timer-value">${seconds}</span>`;
        timerValue = elements.timerDisplay.querySelector('.timer-value');
    } else {
        timerValue.textContent = seconds;
    }
    
    // 2桁の時はクラスを追加（幅をtransitionで変化させる）
    if (seconds >= 10) {
        timerValue.classList.add('two-digit');
    } else {
        timerValue.classList.remove('two-digit');
    }
    
    // 残り3秒以下で警告色に
    if (seconds <= 3) {
        elements.timerDisplay.classList.add('warning');
    } else {
        elements.timerDisplay.classList.remove('warning');
    }
}

// 問題を表示
function displayQuestion(question) {
    // 前の選択肢のフォーカス状態を解除（モバイル対応）
    if (document.activeElement) {
        document.activeElement.blur();
    }
    
    // 前のタイマーをクリア
    clearQuestionTimer();
    
    elements.targetNumber.textContent = question.number;
    elements.choices.innerHTML = '';
    
    question.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.setAttribute('tabindex', '-1');  // フォーカスを無効化
        button.textContent = `${choice.pair[0]} × ${choice.pair[1]}`;
        button.addEventListener('click', () => handleAnswer(choice, button, question));
        elements.choices.appendChild(button);
    });
    
    hideFeedback();
    gameState.isAnswering = false;
    gameState.questionStartTime = Date.now();
    
    // タイマー表示を初期化
    updateTimerDisplay(TIME_LIMIT);
    
    // タイマー表示を1秒ごとに更新
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - gameState.questionStartTime;
        const remaining = TIME_LIMIT - elapsed;
        if (remaining > 0) {
            updateTimerDisplay(remaining);
        }
    }, 100);
    
    // 制限時間後に自動で不正解
    questionTimer = setTimeout(() => {
        handleTimeout(question);
    }, TIME_LIMIT);
}

// タイムアウト処理
function handleTimeout(question) {
    if (gameState.isAnswering) return;
    gameState.isAnswering = true;
    
    clearQuestionTimer();
    
    // タイマー表示を0にする
    elements.timerDisplay.innerHTML = '<span class="timer-value">0</span>';
    
    // 制限時間いっぱいを記録
    gameState.totalTime += TIME_LIMIT;
    
    const buttons = elements.choices.querySelectorAll('.choice-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    gameState.totalQuestions++;
    gameState.wrongCount++;
    
    // 正解を見つけて表示
    const correctChoice = question.choices.find(c => c.isCorrect);
    buttons.forEach((btn, index) => {
        if (question.choices[index].isCorrect) {
            btn.classList.add('correct');
        }
    });
    
    // 履歴に記録（タイムアウト）
    gameState.history.push({
        number: question.number,
        userAnswer: ['時間切れ', ''],
        correctAnswer: correctChoice.pair,
        isCorrect: false
    });
    
    elements.feedbackText.textContent = '時間切れ！';
    elements.feedback.classList.remove('correct', 'wrong');
    elements.feedback.classList.add('wrong', 'visible');
    
    updateUI();
    
    // 次の問題へ
    setTimeout(() => {
        if (gameState.totalQuestions >= MAX_QUESTIONS) {
            showResult();
        } else {
            displayQuestion(generateQuestion());
        }
    }, 1500);
}

// 回答を処理
function handleAnswer(choice, button, question) {
    if (gameState.isAnswering) return;
    gameState.isAnswering = true;
    
    // タイマーをクリア
    clearQuestionTimer();
    
    // 解答時間を記録（delayは含めない）
    gameState.totalTime += Date.now() - gameState.questionStartTime;
    
    // タップ後すぐにフォーカスを解除（モバイル対応）
    button.blur();
    
    const buttons = elements.choices.querySelectorAll('.choice-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    gameState.totalQuestions++;
    
    // 正解を見つける
    const correctChoice = question.choices.find(c => c.isCorrect);
    
    // 待機時間（正解時は短く、不正解時は長く）
    let delay = 700;
    
    // 履歴に記録
    gameState.history.push({
        number: question.number,
        userAnswer: choice.pair,
        correctAnswer: correctChoice.pair,
        isCorrect: choice.isCorrect
    });
    
    if (choice.isCorrect) {
        gameState.correctCount++;
        button.classList.add('correct');
        showFeedback(true);
    } else {
        gameState.wrongCount++;
        button.classList.add('wrong');
        // 正解のボタンも表示
        buttons.forEach((btn, index) => {
            if (question.choices[index].isCorrect) {
                btn.classList.add('correct');
            }
        });
        showFeedback(false);
        delay = 2000; // 不正解時は長めに表示
    }
    
    updateUI();
    
    // 次の問題へ、または結果画面へ
    setTimeout(() => {
        if (gameState.totalQuestions >= MAX_QUESTIONS) {
            showResult();
        } else {
            displayQuestion(generateQuestion());
        }
    }, delay);
}

// 時間をフォーマット（分:秒.小数点1桁）
function formatTime(ms) {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(1);
    if (minutes > 0) {
        return `${minutes}:${seconds.padStart(4, '0')}`;
    }
    return `${seconds}秒`;
}

// 結果を表示
function showResult() {
    const total = gameState.totalQuestions;
    const correct = gameState.correctCount;
    const wrong = gameState.wrongCount;
    const rate = Math.round((correct / total) * 100);
    
    elements.finalCorrect.textContent = correct;
    elements.finalWrong.textContent = wrong;
    elements.finalRate.textContent = `${rate}%`;
    elements.finalTime.textContent = formatTime(gameState.totalTime);
    
    let message = '';
    if (rate === 100) {
        message = '<span class="emoji">🏆</span>パーフェクト！素晴らしい！';
    } else if (rate >= 80) {
        message = '<span class="emoji">🌟</span>素晴らしい成績です！';
    } else if (rate >= 50) {
        message = '<span class="emoji">👍</span>よく頑張りました！';
    } else if (rate >= 30) {
        message = '<span class="emoji">💪</span>もう少し練習してみましょう！';
    } else {
        message = '<span class="emoji">📚</span>約数について復習しましょう！';
    }
    
    elements.resultMessage.innerHTML = message;
    
    // 履歴を表示
    elements.history.innerHTML = gameState.history.map((item, index) => {
        const statusClass = item.isCorrect ? 'correct' : 'wrong';
        const statusText = item.isCorrect ? '○' : '×';
        const userAnswerText = `${item.userAnswer[0]} × ${item.userAnswer[1]}`;
        const correctAnswerText = item.isCorrect ? '' : `（正解: ${item.correctAnswer[0]} × ${item.correctAnswer[1]}）`;
        
        return `
            <div class="history-item ${statusClass}">
                <span class="history-number">${index + 1}.</span>
                <span class="history-question">${item.number}</span>
                <span class="history-status">${statusText}</span>
                <span class="history-answer">${userAnswerText}${correctAnswerText}</span>
            </div>
        `;
    }).join('');
    
    showScreen('result');
}

// ゲームを開始
function startGame() {
    gameState.correctCount = 0;
    gameState.wrongCount = 0;
    gameState.totalQuestions = 0;
    gameState.isAnswering = false;
    gameState.history = [];
    gameState.totalTime = 0;
    
    updateUI();
    showScreen('quiz');
    displayQuestion(generateQuestion());
}

// 難易度選択
function selectDifficulty(level) {
    currentConfig = CONFIGS[level];
    elements.difficultyBtns.forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.level) === level);
    });
}

// イベントリスナー
elements.startBtn.addEventListener('click', startGame);
elements.restartBtn.addEventListener('click', () => {
    showScreen('start');
});

// 難易度ボタンのイベントリスナー
elements.difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        selectDifficulty(parseInt(btn.dataset.level));
    });
});

// キーボードイベント（スペースキーでスタート）
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !screens.start.classList.contains('hidden')) {
        e.preventDefault();
        startGame();
    }
});

// 初期化
function init() {
    elements.totalQuestionsInfo.textContent = `全${MAX_QUESTIONS}問`;
    elements.progressText.textContent = `0 / ${MAX_QUESTIONS}`;
    showScreen('start');
}

init();
