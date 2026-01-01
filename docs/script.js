// ゲームの状態管理
const gameState = {
    correctCount: 0,
    wrongCount: 0,
    totalQuestions: 0,
    targetCorrect: 20,
    currentNumber: 0,
    isAnswering: false
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
    resultMessage: document.getElementById('result-message')
};

// 画面切り替え
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// 約数のペアを取得
function getDivisorPairs(n) {
    const pairs = [];
    for (let i = 1; i <= Math.sqrt(n); i++) {
        if (n % i === 0) {
            pairs.push([i, n / i]);
        }
    }
    return pairs;
}

// ランダムな数を生成（2〜120の範囲で、約数が複数あるもの）
function generateRandomNumber() {
    const numbers = [];
    for (let i = 4; i <= 120; i++) {
        const pairs = getDivisorPairs(i);
        // 約数のペアが2つ以上ある数（1とその数自身以外のペアがある）
        if (pairs.length >= 2) {
            numbers.push(i);
        }
    }
    return numbers[Math.floor(Math.random() * numbers.length)];
}

// 不正解の選択肢を生成
function generateWrongChoice(targetNumber, correctPairs) {
    const maxFactor = 15;
    let attempts = 0;
    
    while (attempts < 100) {
        const a = Math.floor(Math.random() * maxFactor) + 2;
        const b = Math.floor(Math.random() * maxFactor) + 2;
        const product = a * b;
        
        // 正解と同じでなく、ターゲットと異なる積の場合
        if (product !== targetNumber && product <= 150) {
            const isCorrectPair = correctPairs.some(
                pair => (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)
            );
            if (!isCorrectPair) {
                return [Math.min(a, b), Math.max(a, b)];
            }
        }
        attempts++;
    }
    
    // フォールバック
    return [2, targetNumber + 1];
}

// 選択肢をシャッフル
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 新しい問題を生成
function generateQuestion() {
    const number = generateRandomNumber();
    gameState.currentNumber = number;
    const correctPairs = getDivisorPairs(number);
    
    // 正解の選択肢をランダムに1つ選ぶ（1 × n以外を優先）
    const nonTrivialPairs = correctPairs.filter(pair => pair[0] !== 1);
    const correctPair = nonTrivialPairs.length > 0
        ? nonTrivialPairs[Math.floor(Math.random() * nonTrivialPairs.length)]
        : correctPairs[Math.floor(Math.random() * correctPairs.length)];
    
    // 不正解の選択肢を3つ生成
    const wrongChoices = [];
    const usedProducts = new Set([number]);
    
    while (wrongChoices.length < 3) {
        const wrongChoice = generateWrongChoice(number, correctPairs);
        const product = wrongChoice[0] * wrongChoice[1];
        const key = `${wrongChoice[0]}x${wrongChoice[1]}`;
        
        if (!usedProducts.has(product)) {
            wrongChoices.push(wrongChoice);
            usedProducts.add(product);
        }
    }
    
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
    
    const progress = (gameState.correctCount / gameState.targetCorrect) * 100;
    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.textContent = `${gameState.correctCount} / ${gameState.targetCorrect}`;
}

// フィードバックを表示
function showFeedback(isCorrect, correctAnswer) {
    elements.feedback.classList.remove('correct', 'wrong');
    elements.feedback.classList.add(isCorrect ? 'correct' : 'wrong');
    elements.feedback.classList.add('visible');
    
    if (isCorrect) {
        elements.feedbackText.textContent = '正解！ 🎉';
    } else {
        elements.feedbackText.textContent = `不正解... 正解は ${correctAnswer[0]} × ${correctAnswer[1]} = ${gameState.currentNumber}`;
    }
}

// フィードバックを隠す
function hideFeedback() {
    elements.feedback.classList.remove('visible');
}

// 問題を表示
function displayQuestion(question) {
    elements.targetNumber.textContent = question.number;
    elements.choices.innerHTML = '';
    
    question.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.className = 'choice-btn';
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
    
    const buttons = elements.choices.querySelectorAll('.choice-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    gameState.totalQuestions++;
    
    // 正解を見つける
    const correctChoice = question.choices.find(c => c.isCorrect);
    
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
        showFeedback(false, correctChoice.pair);
    }
    
    updateUI();
    
    // 次の問題へ、または結果画面へ
    setTimeout(() => {
        if (gameState.correctCount >= gameState.targetCorrect) {
            showResult();
        } else {
            nextQuestion();
        }
    }, 1500);
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
    if (wrong === 0) {
        message = '<span class="emoji">🏆</span>パーフェクト！素晴らしい！';
    } else if (wrong <= 3) {
        message = '<span class="emoji">🌟</span>素晴らしい成績です！';
    } else if (wrong <= 7) {
        message = '<span class="emoji">👍</span>よく頑張りました！';
    } else {
        message = '<span class="emoji">💪</span>もう少し練習してみましょう！';
    }
    
    elements.resultMessage.innerHTML = message;
    showScreen('result');
}

// ゲームを開始
function startGame() {
    gameState.correctCount = 0;
    gameState.wrongCount = 0;
    gameState.totalQuestions = 0;
    gameState.isAnswering = false;
    
    updateUI();
    showScreen('quiz');
    nextQuestion();
}

// イベントリスナー
elements.startBtn.addEventListener('click', startGame);
elements.restartBtn.addEventListener('click', startGame);

// 初期化
showScreen('start');
