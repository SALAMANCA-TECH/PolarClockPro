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
    const togglePomodoroBtn = document.getElementById('togglePomodoroBtn');
    const resetPomodoroBtn = document.getElementById('resetPomodoro');
    const pomodoroAlarmControls = document.getElementById('pomodoroAlarmControls');
    const mutePomodoroBtn = document.getElementById('mutePomodoroBtn');
    const snoozePomodoroBtn = document.getElementById('snoozePomodoroBtn');
    const customPomodoroBtn = document.getElementById('customPomodoroBtn');
    const pomodoroSettingsModal = document.getElementById('pomodoroSettingsModal');
    const closePomodoroSettingsBtn = document.getElementById('closePomodoroSettingsBtn');
    const cancelPomodoroSettingsBtn = document.getElementById('cancelPomodoroSettings');
    const submitPomodoroSettingsBtn = document.getElementById('submitPomodoroSettings');
    const workDurationModalInput = document.getElementById('pomodoroWorkDurationModal');
    const shortBreakDurationModalInput = document.getElementById('pomodoroShortBreakDurationModal');
    const longBreakDurationModalInput = document.getElementById('pomodoroLongBreakDurationModal');
    const continuousToggleModalInput = document.getElementById('pomodoroContinuousToggleModal');

    // --- Module State ---
    let settings = {};
    const state = {
        timer: { totalSeconds: 0, remainingSeconds: 0, isRunning: false, isInterval: false },
        pomodoro: {
            isRunning: false,
            phase: 'work',
            cycles: 0,
            remainingSeconds: 25 * 60,
            alarmPlaying: false,
            isMuted: false,
            isSnoozed: false,
            hasStarted: false,
            continuous: false,
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15
        },
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
    function togglePomodoro() {
        // If alarm is playing, any action should stop it and start the next phase.
        if (state.pomodoro.alarmPlaying) {
            endCycle();
            return;
        }

        state.pomodoro.isRunning = !state.pomodoro.isRunning;

        if (state.pomodoro.isRunning && !state.pomodoro.hasStarted) {
            state.pomodoro.hasStarted = true;
        }

        // If we are starting a completed timer, start the next phase.
        if (state.pomodoro.isRunning && state.pomodoro.remainingSeconds <= 0) {
            startNextPomodoroPhase(false); // Don't play sound on manual start.
        }
        updatePomodoroUI();
    }


    function resetPomodoro() {
        state.pomodoro.isRunning = false;
        state.pomodoro.phase = 'work';
        state.pomodoro.cycles = 0;
        state.pomodoro.remainingSeconds = state.pomodoro.workDuration * 60;
        state.pomodoro.alarmPlaying = false;
        state.pomodoro.isMuted = false;
        state.pomodoro.isSnoozed = false;
        state.pomodoro.hasStarted = false;
        timerDisplay.style.color = ''; // Reset color
        updatePomodoroDisplay();
        updatePomodoroUI();
        document.dispatchEvent(new CustomEvent('pomodoro-reset'));
    }

    function muteAlarm() {
        state.pomodoro.isMuted = !state.pomodoro.isMuted;
        // Here you would add logic to mute/unmute the actual sound
        updatePomodoroUI();
    }

    function snoozeAlarm() {
        // If this button is clicked while in a snoozed state, it means "End Cycle"
        if (state.pomodoro.isSnoozed) {
            endCycle();
            return;
        }

        state.pomodoro.isSnoozed = true;
        state.pomodoro.remainingSeconds += 5 * 60; // Add 5 minutes
        state.pomodoro.alarmPlaying = false;
        state.pomodoro.isMuted = false; // Ensure next alarm is not muted
        timerDisplay.style.color = '#FFDB58'; // Mustard yellow for snooze
        updatePomodoroDisplay();
        updatePomodoroUI();
    }

    function endCycle() {
        state.pomodoro.isSnoozed = false;
        state.pomodoro.alarmPlaying = false;
        timerDisplay.style.color = ''; // Reset color
        startNextPomodoroPhase(true);
        updatePomodoroUI();
    }

    function startNextPomodoroPhase(playSoundOnStart = true) {
        let nextPhase = 'work';
        let duration = state.pomodoro.workDuration * 60;

        // Determine next phase only if not snoozing
        if (!state.pomodoro.isSnoozed) {
            if (state.pomodoro.phase === 'work') {
                state.pomodoro.cycles++;
                if (state.pomodoro.cycles > 0 && state.pomodoro.cycles % 4 === 0) {
                    nextPhase = 'longBreak';
                    duration = state.pomodoro.longBreakDuration * 60;
                } else {
                    nextPhase = 'shortBreak';
                    duration = state.pomodoro.shortBreakDuration * 60;
                }
            } else {
                nextPhase = 'work';
                duration = state.pomodoro.workDuration * 60;
            }
            state.pomodoro.phase = nextPhase;
        }

        state.pomodoro.remainingSeconds = duration;

        if (playSoundOnStart && !state.pomodoro.isMuted) {
            playSound(settings.timerSound);
        }
        updatePomodoroDisplay();
        state.pomodoro.isRunning = true; // Auto-start the next cycle
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

    function updatePomodoroUI() {
        const mainControls = document.getElementById('pomodoro-main-controls');
        const alarmControls = document.getElementById('pomodoroAlarmControls');
        const toggleBtn = document.getElementById('togglePomodoroBtn');
        const resetBtn = document.getElementById('resetPomodoro');
        const muteBtn = document.getElementById('mutePomodoroBtn');
        const snoozeBtn = document.getElementById('snoozePomodoroBtn');

        if (!mainControls) return; // Exit if the elements are not on the page

        // Main toggle button text
        toggleBtn.textContent = state.pomodoro.isRunning ? 'Pause' : 'Start';

        // Reset button visibility
        resetBtn.style.display = state.pomodoro.hasStarted ? 'inline-block' : 'none';

        // Control sets visibility
        mainControls.style.display = state.pomodoro.alarmPlaying ? 'none' : 'flex';
        alarmControls.style.display = state.pomodoro.alarmPlaying ? 'flex' : 'none';

        // Mute button state
        muteBtn.textContent = state.pomodoro.isMuted ? 'Unmute' : 'Mute';
        muteBtn.style.backgroundColor = state.pomodoro.isMuted ? '#4CAF50' : 'transparent';
        muteBtn.style.borderColor = state.pomodoro.isMuted ? '#4CAF50' : '#444';

        // Snooze button state
        snoozeBtn.textContent = state.pomodoro.isSnoozed ? 'End Cycle' : 'Snooze';
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
        togglePomodoroBtn.addEventListener('click', togglePomodoro);
        resetPomodoroBtn.addEventListener('click', resetPomodoro);
        mutePomodoroBtn.addEventListener('click', muteAlarm);
        snoozePomodoroBtn.addEventListener('click', snoozeAlarm);
        // This listener is for the modal's toggle.
        continuousToggleModalInput.addEventListener('change', (e) => {
            state.pomodoro.continuous = e.target.checked;
        });

        // Modal Logic
        customPomodoroBtn.addEventListener('click', () => {
            // Populate modal with current values from state
            workDurationModalInput.value = state.pomodoro.workDuration;
            shortBreakDurationModalInput.value = state.pomodoro.shortBreakDuration;
            longBreakDurationModalInput.value = state.pomodoro.longBreakDuration;
            continuousToggleModalInput.checked = state.pomodoro.continuous;
            pomodoroSettingsModal.classList.remove('hidden');
        });

        const closeModal = () => pomodoroSettingsModal.classList.add('hidden');
        closePomodoroSettingsBtn.addEventListener('click', closeModal);
        cancelPomodoroSettingsBtn.addEventListener('click', closeModal);

        submitPomodoroSettingsBtn.addEventListener('click', () => {
            // Save settings from modal to state
            state.pomodoro.workDuration = parseInt(workDurationModalInput.value) || 25;
            state.pomodoro.shortBreakDuration = parseInt(shortBreakDurationModalInput.value) || 5;
            state.pomodoro.longBreakDuration = parseInt(longBreakDurationModalInput.value) || 15;
            state.pomodoro.continuous = continuousToggleModalInput.checked;

            // If timer is not running, reset it to apply new duration settings
            if (!state.pomodoro.isRunning && !state.pomodoro.hasStarted) {
                resetPomodoro();
            }

            closeModal();
        });
    }


    // --- Public API ---
    return {
        init: function(appSettings) {
            settings = appSettings;
            setupAllEventListeners();
            updateLapDisplay();
            updateButtonStates();
            updatePomodoroDisplay();
            updatePomodoroUI();
        },
        update: function(deltaTime) {
            if (state.timer.isRunning) {
                state.timer.remainingSeconds -= deltaTime;
                if (state.timer.remainingSeconds <= 0) timerFinished();
            }
            if (state.pomodoro.isRunning && !state.pomodoro.alarmPlaying) {
                state.pomodoro.remainingSeconds -= deltaTime;
                if (state.pomodoro.remainingSeconds <= 0) {
                    state.pomodoro.isRunning = false;
                    if (state.pomodoro.continuous) {
                        startNextPomodoroPhase(true);
                    } else {
                        state.pomodoro.remainingSeconds = 0;
                        state.pomodoro.alarmPlaying = true;
                        if (!state.pomodoro.isMuted) {
                            playSound(settings.timerSound || 'bell01.mp3');
                        }
                        updatePomodoroUI();
                    }
                }
            }
            updatePomodoroDisplay(); // Keep display updated regardless of running state
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
