const Tools = (function() {
    // --- DOM Element Selections ---
    const toggleTimerBtn = document.getElementById('toggleTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimer');
    const timerHoursInput = document.getElementById('timerHours');
    const timerMinutesInput = document.getElementById('timerMinutes');
    const timerSecondsInput = document.getElementById('timerSeconds');
    const intervalToggle = document.getElementById('intervalToggle');

    const toggleStopwatchBtn = document.getElementById('toggleStopwatchBtn');
    const lapStopwatchBtn = document.getElementById('lapStopwatch');
    const resetStopwatchBtn = document.getElementById('resetStopwatch');
    const lapTimesContainer = document.getElementById('lapTimes');

    const catchUpMinutesInput = document.getElementById('catchUpMinutes');
    const catchUpSecondsInput = document.getElementById('catchUpSeconds');
    const addCatchUpTimeBtn = document.getElementById('addCatchUpTimeBtn');

    const statusDisplay = document.getElementById('pomodoroStatus');
    const timerDisplay = document.getElementById('pomodoroTimerDisplay');
    const workDurationInput = document.getElementById('pomodoroWorkDuration');
    const shortBreakDurationInput = document.getElementById('pomodoroShortBreakDuration');
    const longBreakDurationInput = document.getElementById('pomodoroLongBreakDuration');

    // --- Module State ---
    let settings = {};
    const state = {
        timer: { totalSeconds: 0, remainingSeconds: 0, isRunning: false, isInterval: false },
        pomodoro: { isRunning: false, phase: 'work', cycles: 0, remainingSeconds: 25 * 60 },
        stopwatch: { startTime: 0, elapsedTime: 0, isRunning: false, laps: [] }
    };

    // --- Private Functions ---

    // Timer Functions
    function toggleTimer() {
        state.timer.isRunning ? pauseTimer() : startTimer();
    }

    function startTimer() {
        if (state.timer.remainingSeconds <= 0) {
            state.timer.totalSeconds = (parseInt(timerHoursInput.value) || 0) * 3600 + (parseInt(timerMinutesInput.value) || 0) * 60 + (parseInt(timerSecondsInput.value) || 0);
            state.timer.remainingSeconds = state.timer.totalSeconds;
        }
        if (state.timer.remainingSeconds > 0) {
            state.timer.isRunning = true;
        }
        updateButtonStates();
    }

    function pauseTimer() {
        state.timer.isRunning = false;
        updateButtonStates();
    }

    function resetTimer() {
        state.timer.isRunning = false;
        state.timer.totalSeconds = 0;
        state.timer.remainingSeconds = 0;
        timerHoursInput.value = "0";
        timerMinutesInput.value = "0";
        timerSecondsInput.value = "0";
        updateButtonStates();
    }

    function timerFinished() {
        playSound(settings.timerSound);
        if (state.timer.isInterval) {
            state.timer.remainingSeconds = state.timer.totalSeconds;
        } else {
            resetTimer();
        }
    }

    // Stopwatch Functions
    function toggleStopwatch() {
        state.stopwatch.isRunning ? pauseStopwatch() : startStopwatch();
    }

    function startStopwatch() {
        state.stopwatch.isRunning = true;
        state.stopwatch.startTime = Date.now() - state.stopwatch.elapsedTime;
        updateButtonStates();
    }

    function pauseStopwatch() {
        state.stopwatch.isRunning = false;
        updateButtonStates();
    }

    function resetStopwatch() {
        state.stopwatch.isRunning = false;
        state.stopwatch.elapsedTime = 0;
        state.stopwatch.laps = [];
        updateLapDisplay();
        catchUpMinutesInput.value = '';
        catchUpSecondsInput.value = '';
        updateButtonStates();
        document.dispatchEvent(new CustomEvent('statechange'));
    }

    function lapStopwatch() {
        if (!state.stopwatch.isRunning && state.stopwatch.elapsedTime === 0) return;
        state.stopwatch.laps.push({ time: state.stopwatch.elapsedTime, label: '' });
        updateLapDisplay();
        document.dispatchEvent(new CustomEvent('statechange'));
    }

    function updateLapDisplay() {
        lapTimesContainer.innerHTML = '';
        state.stopwatch.laps.forEach((lap, index) => {
            const lapElement = document.createElement('li');
            lapElement.classList.add('lap-item');
            lapElement.innerHTML = `
                <span class="lap-number">Lap ${index + 1}</span>
                <span class="lap-time">${formatTime(lap.time)}</span>
                <input type="text" class="lap-label-input" value="${lap.label}" data-index="${index}" placeholder="Add label...">
            `;
            lapTimesContainer.prepend(lapElement);
        });
    }

    function formatTime(ms) {
        const d = new Date(ms);
        return `${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')}.${d.getUTCMilliseconds().toString().padStart(3, '0')}`;
    }

    function addManualCatchUpTime() {
        const minutes = parseInt(catchUpMinutesInput.value) || 0;
        const seconds = parseInt(catchUpSecondsInput.value) || 0;
        const timeToAddMs = (minutes * 60 + seconds) * 1000;
        if (timeToAddMs > 0) {
            state.stopwatch.elapsedTime += timeToAddMs;
            if (state.stopwatch.isRunning) {
                state.stopwatch.startTime -= timeToAddMs;
            }
            catchUpMinutesInput.value = '';
            catchUpSecondsInput.value = '';
            document.dispatchEvent(new CustomEvent('statechange'));
        }
    }

    // Pomodoro Functions
    function startPomodoro() {
        if (state.pomodoro.isRunning) return;
        state.pomodoro.isRunning = true;
        if (state.pomodoro.remainingSeconds <= 0) {
            startNextPomodoroPhase();
        }
    }

    function pausePomodoro() {
        state.pomodoro.isRunning = false;
    }

    function resetPomodoro() {
        state.pomodoro.isRunning = false;
        state.pomodoro.phase = 'work';
        state.pomodoro.cycles = 0;
        state.pomodoro.remainingSeconds = (parseInt(workDurationInput.value) || 25) * 60;
        updatePomodoroDisplay();
        document.dispatchEvent(new CustomEvent('pomodoro-reset'));
    }

    function startNextPomodoroPhase() {
        let nextPhase = 'work';
        let duration = (parseInt(workDurationInput.value) || 25) * 60;
        if (state.pomodoro.phase === 'work') {
            state.pomodoro.cycles++;
            if (state.pomodoro.cycles % 4 === 0) {
                nextPhase = 'longBreak';
                duration = (parseInt(longBreakDurationInput.value) || 15) * 60;
            } else {
                nextPhase = 'shortBreak';
                duration = (parseInt(shortBreakDurationInput.value) || 5) * 60;
            }
        }
        state.pomodoro.phase = nextPhase;
        state.pomodoro.remainingSeconds = duration;
        playSound(settings.timerSound);
        updatePomodoroDisplay();
    }

    function updatePomodoroDisplay() {
        const minutes = Math.floor(state.pomodoro.remainingSeconds / 60);
        const seconds = Math.floor(state.pomodoro.remainingSeconds % 60);
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        let statusText = "Work Session";
        if (state.pomodoro.phase === 'shortBreak') statusText = "Short Break";
        if (state.pomodoro.phase === 'longBreak') statusText = "Long Break";
        statusDisplay.textContent = statusText;
    }

    // Shared Functions
    function playSound(soundFile) {
        if (!soundFile) return;
        const audio = new Audio(`assets/Sounds/${soundFile}`);
        audio.volume = settings.volume || 1.0;
        audio.play().catch(e => console.error("Error playing sound:", e));
    }

    function updateButtonStates() {
        toggleTimerBtn.textContent = state.timer.isRunning ? 'Pause' : 'Start';
        toggleStopwatchBtn.textContent = state.stopwatch.isRunning ? 'Pause' : 'Start';
    }

    function setupAllEventListeners() {
        // Timer
        toggleTimerBtn.addEventListener('click', toggleTimer);
        resetTimerBtn.addEventListener('click', resetTimer);
        intervalToggle.addEventListener('change', (e) => state.timer.isInterval = e.target.checked);

        // Stopwatch
        toggleStopwatchBtn.addEventListener('click', toggleStopwatch);
        resetStopwatchBtn.addEventListener('click', resetStopwatch);
        lapStopwatchBtn.addEventListener('click', lapStopwatch);
        addCatchUpTimeBtn.addEventListener('click', addManualCatchUpTime);
        lapTimesContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('lap-label-input')) {
                const index = parseInt(e.target.dataset.index);
                const arrayIndex = state.stopwatch.laps.length - 1 - index;
                state.stopwatch.laps[arrayIndex].label = e.target.value;
                document.dispatchEvent(new CustomEvent('statechange'));
            }
        });

        // Pomodoro
        document.getElementById('startPomodoro').addEventListener('click', startPomodoro);
        document.getElementById('pausePomodoro').addEventListener('click', pausePomodoro);
        document.getElementById('resetPomodoro').addEventListener('click', resetPomodoro);
    }


    // --- Public API ---
    return {
        init: function(appSettings) {
            settings = appSettings;
            setupAllEventListeners();
            updateLapDisplay();
            updateButtonStates();
            updatePomodoroDisplay();
        },
        update: function(deltaTime) {
            if (state.timer.isRunning) {
                state.timer.remainingSeconds -= deltaTime;
                if (state.timer.remainingSeconds <= 0) timerFinished();
            }
            if (state.pomodoro.isRunning) {
                state.pomodoro.remainingSeconds -= deltaTime;
                updatePomodoroDisplay();
                if (state.pomodoro.remainingSeconds <= 0) startNextPomodoroPhase();
            }
            if (state.stopwatch.isRunning) {
                state.stopwatch.elapsedTime = Date.now() - state.stopwatch.startTime;
            }
        },
        getState: function() {
            // Return a copy of the state relevant to other modules (like the clock)
            return {
                timer: { ...state.timer },
                pomodoro: { ...state.pomodoro },
                stopwatch: { ...state.stopwatch }
            };
        }
    };
})();
