// IELTS Word Spelling Test Application
// Design based on LPM research with 70% item recycling rate

class SpellingTestApp {
    constructor() {
        this.words = [];
        this.currentTestWords = [];
        this.currentWordIndex = 0;
        this.score = 0;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.studentAnswers = [];
        this.studentId = '';
        this.testNumber = 1;
        this.previousTestWords = [];

        this.init();
    }

    async init() {
        // Load vocabulary
        await this.loadVocabulary();

        // Load previous test data for recycling
        this.loadPreviousTestData();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize speech synthesis
        this.speechSynth = window.speechSynthesis;
    }

    async loadVocabulary() {
        try {
            const response = await fetch('merged/ielts_vocabulary.json');
            const data = await response.json();
            this.words = data.vocabulary;
            console.log(`Loaded ${this.words.length} words from vocabulary`);
        } catch (error) {
            console.error('Error loading vocabulary:', error);
            alert('加载词汇表失败，请检查文件路径');
        }
    }

    loadPreviousTestData() {
        // Load previous test words from localStorage for recycling
        const savedData = localStorage.getItem('spellingTestHistory');
        if (savedData) {
            const history = JSON.parse(savedData);
            // Get words from the most recent previous test
            if (history.length > 0) {
                const lastTest = history[history.length - 1];
                this.previousTestWords = lastTest.words || [];
                console.log(`Loaded ${this.previousTestWords.length} words from previous test for recycling`);
            }
        }
    }

    setupEventListeners() {
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => this.startTest());

        // Audio button
        document.getElementById('audioBtn').addEventListener('click', () => this.playAudio());

        // Submit button
        document.getElementById('submitBtn').addEventListener('click', () => this.submitAnswer());

        // Next button
        document.getElementById('nextBtn').addEventListener('click', () => this.nextWord());

        // Enter key for submission
        document.getElementById('wordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitAnswer();
            }
        });

        // Result navigation buttons
        document.getElementById('reviewBtn').addEventListener('click', () => this.showDetailedResults());
        document.getElementById('homeBtn').addEventListener('click', () => this.goHome());
        document.getElementById('backToResultsBtn').addEventListener('click', () => this.backToResults());
    }

    selectTestWords() {
        // Implement 70% recycling rate: 14 words from previous test, 6 new words
        const recycledCount = 14;
        const newCount = 6;
        const totalWords = 20;

        let selectedWords = [];
        let availableWords = [...this.words];

        // Select words from previous test (70% recycling)
        if (this.previousTestWords.length >= recycledCount) {
            // Randomly select 14 words from previous test
            const shuffled = [...this.previousTestWords].sort(() => Math.random() - 0.5);
            selectedWords = shuffled.slice(0, recycledCount);

            // Remove recycled words from available pool
            const recycledWordsSet = new Set(selectedWords.map(w => w.word));
            availableWords = availableWords.filter(w => !recycledWordsSet.has(w.word));
        } else {
            // If not enough previous words, use fewer recycled words
            selectedWords = [...this.previousTestWords];
            const recycledWordsSet = new Set(selectedWords.map(w => w.word));
            availableWords = availableWords.filter(w => !recycledWordsSet.has(w.word));
        }

        // Select new words to fill remaining slots
        const remainingSlots = totalWords - selectedWords.length;
        if (remainingSlots > 0 && availableWords.length >= remainingSlots) {
            const shuffledAvailable = availableWords.sort(() => Math.random() - 0.5);
            selectedWords = selectedWords.concat(shuffledAvailable.slice(0, remainingSlots));
        }

        // Shuffle final selection
        this.currentTestWords = selectedWords.sort(() => Math.random() - 0.5);

        console.log(`Selected ${this.currentTestWords.length} words for test`);
        console.log(`Recycled: ${selectedWords.filter(w => this.previousTestWords.some(pw => pw.word === w.word)).length} words`);

        return this.currentTestWords;
    }

    startTest() {
        // Validate student ID
        const studentIdInput = document.getElementById('studentId').value.trim();
        if (!studentIdInput) {
            alert('请输入学号/ID');
            return;
        }

        this.studentId = studentIdInput;
        this.testNumber = parseInt(document.getElementById('testNumber').value);

        // Reset test state
        this.currentWordIndex = 0;
        this.score = 0;
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.studentAnswers = [];

        // Select words for this test
        this.selectTestWords();

        // Update UI
        this.updateProgress();
        this.showScreen('testScreen');
        this.loadCurrentWord();
    }

    loadCurrentWord() {
        const currentWord = this.currentTestWords[this.currentWordIndex];

        // Reset UI for new word
        document.getElementById('wordInput').value = '';
        document.getElementById('wordInput').disabled = false;
        document.getElementById('wordInput').focus();
        document.getElementById('submitBtn').classList.remove('hidden');
        document.getElementById('feedback').classList.add('hidden');
        document.getElementById('nextBtn').classList.add('hidden');

        // Auto-play audio for first word
        if (this.currentWordIndex === 0) {
            setTimeout(() => this.playAudio(), 500);
        }
    }

    playAudio() {
        const currentWord = this.currentTestWords[this.currentWordIndex];
        if (!currentWord) return;

        // Cancel any ongoing speech
        this.speechSynth.cancel();

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.lang = 'en-US';
        utterance.rate = 0.8; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Visual feedback
        const audioBtn = document.getElementById('audioBtn');
        audioBtn.style.transform = 'scale(0.95)';

        utterance.onend = () => {
            audioBtn.style.transform = 'scale(1)';
        };

        this.speechSynth.speak(utterance);
    }

    submitAnswer() {
        const input = document.getElementById('wordInput');
        const userAnswer = input.value.trim().toLowerCase();
        const currentWord = this.currentTestWords[this.currentWordIndex];
        const correctAnswer = currentWord.word.toLowerCase();

        if (!userAnswer) {
            alert('请输入您的答案');
            return;
        }

        // Disable input after submission
        input.disabled = true;
        document.getElementById('submitBtn').classList.add('hidden');

        // Check answer
        const isCorrect = userAnswer === correctAnswer;

        // Update score
        if (isCorrect) {
            this.score += 5;
            this.correctCount++;
        } else {
            this.incorrectCount++;
        }

        // Save answer
        this.studentAnswers.push({
            word: currentWord.word,
            userAnswer: input.value.trim(),
            correctAnswer: correctAnswer,
            isCorrect: isCorrect,
            difficulty: currentWord.difficulty,
            pos: currentWord.pos
        });

        // Show feedback
        this.showFeedback(isCorrect, correctAnswer);

        // Update current score display
        document.getElementById('currentScore').textContent = this.score;
    }

    showFeedback(isCorrect, correctAnswer) {
        const feedback = document.getElementById('feedback');
        const correctAnswerDiv = document.getElementById('correctAnswer');

        feedback.classList.remove('hidden', 'correct', 'incorrect');
        correctAnswerDiv.classList.add('hidden');

        if (isCorrect) {
            feedback.classList.add('correct');
        } else {
            feedback.classList.add('incorrect');
            correctAnswerDiv.textContent = correctAnswer;
            correctAnswerDiv.classList.remove('hidden');
        }

        // Show next button
        document.getElementById('nextBtn').classList.remove('hidden');
    }

    nextWord() {
        this.currentWordIndex++;

        if (this.currentWordIndex >= this.currentTestWords.length) {
            this.endTest();
        } else {
            this.updateProgress();
            this.loadCurrentWord();
        }
    }

    updateProgress() {
        const progress = ((this.currentWordIndex + 1) / 20) * 100;
        document.getElementById('currentWord').textContent = this.currentWordIndex + 1;
        document.getElementById('progressFill').style.width = progress + '%';
    }

    endTest() {
        // Save test data to localStorage for future recycling
        this.saveTestData();

        // Update results screen
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('correctCount').textContent = this.correctCount;
        document.getElementById('incorrectCount').textContent = this.incorrectCount;
        document.getElementById('accuracy').textContent =
            ((this.correctCount / 20) * 100).toFixed(1) + '%';

        // Show wrong answers if any
        const wrongAnswers = this.studentAnswers.filter(a => !a.isCorrect);
        const wrongAnswersDiv = document.getElementById('wrongAnswers');
        const wrongList = document.getElementById('wrongList');

        if (wrongAnswers.length > 0) {
            wrongAnswersDiv.classList.remove('hidden');
            wrongList.innerHTML = wrongAnswers.map(a =>
                `<li><strong>${a.word}</strong> - 你的答案: ${a.userAnswer || '(未作答)'}</li>`
            ).join('');
        } else {
            wrongAnswersDiv.classList.add('hidden');
        }

        this.showScreen('resultsScreen');
    }

    saveTestData() {
        const testData = {
            studentId: this.studentId,
            testNumber: this.testNumber,
            testTime: new Date().toISOString(),
            score: this.score,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            words: this.currentTestWords,
            answers: this.studentAnswers
        };

        // Save to localStorage
        let history = JSON.parse(localStorage.getItem('spellingTestHistory') || '[]');

        // Update if same student and test number exists, otherwise add new
        const existingIndex = history.findIndex(
            h => h.studentId === testData.studentId && h.testNumber === testData.testNumber
        );

        if (existingIndex >= 0) {
            history[existingIndex] = testData;
        } else {
            history.push(testData);
        }

        localStorage.setItem('spellingTestHistory', JSON.stringify(history));

        // Also save as current test words for next recycling
        this.previousTestWords = this.currentTestWords;
    }

    showDetailedResults() {
        // Populate detailed results
        document.getElementById('detailStudentId').textContent = this.studentId;
        document.getElementById('detailTestNumber').textContent = this.testNumber;
        document.getElementById('detailTestTime').textContent =
            new Date().toLocaleString('zh-CN');

        const tableBody = document.getElementById('resultsTableBody');
        tableBody.innerHTML = this.studentAnswers.map((answer, index) => `
            <tr class="${answer.isCorrect ? 'correct-row' : 'incorrect-row'}">
                <td>${index + 1}</td>
                <td>${answer.word}</td>
                <td>${answer.userAnswer || '(未作答)'}</td>
                <td class="result-icon">${answer.isCorrect ? '✓' : '✗'}</td>
                <td>${answer.isCorrect ? '5' : '0'}</td>
            </tr>
        `).join('');

        this.showScreen('detailedResultsScreen');
    }

    backToResults() {
        this.showScreen('resultsScreen');
    }

    goHome() {
        // Reset to welcome screen
        document.getElementById('studentId').value = '';
        this.showScreen('welcomeScreen');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SpellingTestApp();
});
