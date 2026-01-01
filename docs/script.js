// ゲームの状態管理
const gameState = {
    correctCount: 0,
    wrongCount: 0,
    totalQuestions: 0,
    maxQuestions: 10,
    currentNumber: 0,
    isAnswering: false,
    history: [] // 問題履歴
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
    resultMessage: document.getElementById('result-message'),
    history: document.getElementById('history'),
    totalQuestionsInfo: document.getElementById('total-questions-info')
};

// 画面切り替え
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

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

// 37以下の素数（小さい順）
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];

// 重み付きランダム選択（小さい素数ほど高確率）
function selectWeightedPrime() {
    // 重み: 2, 3, 5, 7を特に高確率に
    const weights = [25, 20, 15, 12, 3, 2, 1, 1, 1, 1, 1, 1];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < PRIMES.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return PRIMES[i];
        }
    }
    return PRIMES[0];
}

// 現在の数値に応じて停止確率を計算
function getStopProbability(value) {
    if (value < 20) {
        return 0; // 20未満は続ける
    } else if (value <= 40) {
        return 0.3; // 20〜40は30%で停止
    } else if (value <= 60) {
        return 0.5; // 40〜60は50%で停止
    } else if (value <= 80) {
        return 0.6; // 60〜80は60%で停止
    } else if (value <= 120) {
        return 0.75; // 80〜120は75%で停止
    } else {
        return 1.0; // それ以上は100%で停止
    }
}

// クイズの正解となる数を生成（素数を掛け合わせて生成）
function generateAnswerNumber(maxValue = 150) {
    let result = selectWeightedPrime();
    const divisors = [result];
    let retry = 0;
    
    while (divisors.length < 5) {
        const prime = selectWeightedPrime();
        const newResult = result * prime;
        
        // 上限を超えたら終了
        if (newResult > maxValue) {
            if (divisors.length < 2) {
                result *= [2, 3][Math.floor(Math.random() * 2)];
            }else if (retry < 3){
                retry++;
                continue;
            }
            break;
        }
        
        result = newResult;
        divisors.push(result);
        
        // 現在の値に応じて停止するかどうかを判定
        if (Math.random() < getStopProbability(result)) {
            break;
        }
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

// UIを更新
function updateUI() {
    elements.correctCount.textContent = gameState.correctCount;
    elements.wrongCount.textContent = gameState.wrongCount;
    
    const progress = (gameState.totalQuestions / gameState.maxQuestions) * 100;
    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.textContent = `${gameState.totalQuestions} / ${gameState.maxQuestions}`;
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

// 問題を表示
function displayQuestion(question) {
    // 前の選択肢のフォーカス状態を解除（モバイル対応）
    if (document.activeElement) {
        document.activeElement.blur();
    }
    
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
}

// 回答を処理
function handleAnswer(choice, button, question) {
    if (gameState.isAnswering) return;
    gameState.isAnswering = true;
    
    // タップ後すぐにフォーカスを解除（モバイル対応）
    button.blur();
    
    const buttons = elements.choices.querySelectorAll('.choice-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    gameState.totalQuestions++;
    
    // 正解を見つける
    const correctChoice = question.choices.find(c => c.isCorrect);
    
    // 待機時間（正解時は短く、不正解時は長く）
    let delay = 1000;
    
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
        if (gameState.totalQuestions >= gameState.maxQuestions) {
            showResult();
        } else {
            nextQuestion();
        }
    }, delay);
}

// 次の問題
function nextQuestion() {
    const question = generateQuestion();
    displayQuestion(question);
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
    
    updateUI();
    showScreen('quiz');
    nextQuestion();
}

// イベントリスナー
elements.startBtn.addEventListener('click', startGame);
elements.restartBtn.addEventListener('click', startGame);

// キーボードイベント（スペースキーでスタート）
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !screens.start.classList.contains('hidden')) {
        e.preventDefault();
        startGame();
    }
});

// 初期化
function init() {
    elements.totalQuestionsInfo.textContent = `全${gameState.maxQuestions}問`;
    elements.progressText.textContent = `0 / ${gameState.maxQuestions}`;
    showScreen('start');
}

init();
