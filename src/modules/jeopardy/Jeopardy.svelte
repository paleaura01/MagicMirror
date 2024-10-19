<script>
    import { onMount } from 'svelte';
    import './jeopardy_styles.css';
    let questions = [];
    let currentQuestion = {};
    let showAnswer = false;
    let currentIndex = 0;
    let score = 0;
    let topScore = parseInt(localStorage.getItem('topScore')) || 0; // Retrieve the top score from localStorage
    let options = [];
    let selectedOption = null;
    let autoNextTimeout;

    onMount(async () => {
        const res = await fetch('/src/modules/jeopardy/JEOPARDY_QUESTIONS1.json');
        questions = await res.json();
        shuffleQuestions();
        getNextQuestion();
    });

    function shuffleQuestions() {
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
    }

    function getNextQuestion() {
        currentQuestion = questions[currentIndex];
        currentIndex = (currentIndex + 1) % questions.length;

        const incorrectOptions = [];
        while (incorrectOptions.length < 3) {
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            if (randomQuestion.answer !== currentQuestion.answer && !incorrectOptions.includes(randomQuestion.answer)) {
                incorrectOptions.push(randomQuestion.answer);
            }
        }

        options = [
            { text: capitalizeFirstLetter(currentQuestion.answer), isCorrect: true },
            ...incorrectOptions.map(answer => ({ text: capitalizeFirstLetter(answer), isCorrect: false }))
        ];
        options.sort(() => Math.random() - 0.5);

        currentQuestion.question = currentQuestion.question
            .replace(/\\/g, '')
            .replace(/<[^>]*>/g, '');

        showAnswer = false;
        selectedOption = null;

        clearTimeout(autoNextTimeout);
        autoNextTimeout = setTimeout(() => {
            showAnswer = true;
            selectedOption = null;
            setTimeout(getNextQuestion, 5000);
        }, 10000);
    }

    function handleAnswer(option) {
        selectedOption = option;

        if (selectedOption.isCorrect) {
            score += parseInt(currentQuestion.value.replace(/[^0-9]/g, '')) || 0;
        } else {
            score -= parseInt(currentQuestion.value.replace(/[^0-9]/g, '')) || 0;
        }

        if (score > topScore) {
            topScore = score;
            localStorage.setItem('topScore', topScore);
        }

        showAnswer = true;
        clearTimeout(autoNextTimeout);
        setTimeout(getNextQuestion, 5000);
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
</script>

<div class="jeopardy-container">
    <img src="/src/modules/jeopardy/pics/Jeopardy.jpg" alt="Jeopardy" class="jeopardy-image" />
    <div class="jeopardy-content">
        <div class="category">CATEGORY: {currentQuestion.category}</div>
        <div class="score-value-container">
            <div class="top-score">Top Score: ${topScore}</div>
            <div class="score">Total Score: ${score}</div>
            <div class="value">For: {currentQuestion.value}</div>
        </div>
        <div class="clue">The clue is: '{currentQuestion.question}'</div>

        {#if showAnswer}
            <div class="answer" style="color: {selectedOption === null ? 'white' : (selectedOption.isCorrect ? '#00ff00' : 'red')}">
                {selectedOption === null 
                    ? 'The Answer Is: ' + capitalizeFirstLetter(currentQuestion.answer)
                    : (selectedOption.isCorrect 
                        ? 'The correct answer is: ' + capitalizeFirstLetter(currentQuestion.answer) 
                        : 'The correct answer is: ' + capitalizeFirstLetter(currentQuestion.answer))}
            </div>
        {:else}
            <div class="options">
                {#each options as option, index}
                    <button 
                        class:option-row-top={index < 2}
                        class:option-row-bottom={index >= 2}
                        on:click={() => handleAnswer(option)} style="text-transform: capitalize;">
                        {option.text}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>
