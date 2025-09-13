const Tools = (function() {
    // --- DOM Element Selections ---
    const toggleTimerBtn = document.getElementById('toggleTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimer');
    const timerDaysInput = document.getElementById('timerDays');
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
    const pomodoroWorkDisplay = document.getElementById('pomodoroWorkDisplay');
    const pomodoroShortBreakDisplay = document.getElementById('pomodoroShortBreakDisplay');
    const pomodoroLongBreakDisplay = document.getElementById('pomodoroLongBreakDisplay');
    const togglePomodoroBtn = document.getElementById('togglePomodoroBtn');
    const resetPomodoroBtn = document.getElementById('resetPomodoro');
    const pomodoroAlarmControls = document.getElementById('pomodoroAlarmControls');
    const mutePomodoroBtn = document.getElementById('pomodoroMuteBtn');
    const snoozePomodoroBtn = document.getElementById('pomodoroSnoozeBtn');
    const nextCyclePomodoroBtn = document.getElementById('nextCyclePomodoroBtn');
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
            longBreakDuration: 15,
            isOneMinuteWarningPlayed: false,
            actionButtonsVisible: false,
            lastMinuteSoundPlayed: false,
            isMutedThisCycle: false,
            isSnoozing: false,
            currentAudio: null
        },
        stopwatch: { startTime: 0, elapsedTime: 0, isRunning: false, laps: [] }
    };

    // --- Private Functions ---

    function setTimerInputsDisabled(disabled) {
        timerDaysInput.disabled = disabled;
        timerHoursInput.disabled = disabled;
        timerMinutesInput.disabled = disabled;
        timerSecondsInput.disabled = disabled;
    }

    // Timer Functions
    function normalizeTimerInputs() {
        const days = parseInt(timerDaysInput.value) || 0;
        const hours = parseInt(timerHoursInput.value) || 0;
        const minutes = parseInt(timerMinutesInput.value) || 0;
        const seconds = parseInt(timerSecondsInput.value) || 0;

        let totalSeconds = (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;

        const newDays = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        const newHours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const newMinutes = Math.floor(totalSeconds / 60);
        const newSeconds = totalSeconds % 60;

        timerDaysInput.value = newDays;
        timerHoursInput.value = newHours;
        timerMinutesInput.value = newMinutes;
        timerSecondsInput.value = newSeconds;

        const finalTotalSeconds = (newDays * 86400) + (newHours * 3600) + (newMinutes * 60) + newSeconds;
        state.timer.totalSeconds = finalTotalSeconds;
        // Only reset remaining seconds if the timer isn't running.
        // This prevents overwriting the countdown when an input is blurred.
        if (!state.timer.isRunning) {
            state.timer.remainingSeconds = finalTotalSeconds;
        }
    }


    function toggleTimer() {
        state.timer.isRunning ? pauseTimer() : startTimer();
    }

    function startTimer() {
        // When starting, if the timer is at 0, we must get the values from the inputs.
        // Normalizing here also handles the case where a user types and immediately hits start.
        if (state.timer.remainingSeconds <= 0) {
            normalizeTimerInputs();
        }

        if (state.timer.remainingSeconds > 0) {
            state.timer.isRunning = true;
            setTimerInputsDisabled(true);
        }
        updateButtonStates();
    }

    function pauseTimer() {
        state.timer.isRunning = false;
        setTimerInputsDisabled(false);
        updateButtonStates();
    }

    function resetTimer() {
        state.timer.isRunning = false;
        setTimerInputsDisabled(false);
        state.timer.totalSeconds = 0;
        state.timer.remainingSeconds = 0;
        timerDaysInput.value = "0";
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
        state.pomodoro.isOneMinuteWarningPlayed = false;
        state.pomodoro.lastMinuteSoundPlayed = false;
        state.pomodoro.isMutedThisCycle = false;
        state.pomodoro.isSnoozing = false;
        state.pomodoro.actionButtonsVisible = false;
        if (state.pomodoro.currentAudio) {
            state.pomodoro.currentAudio.pause();
            state.pomodoro.currentAudio = null;
        }
        updatePomodoroDashboard();
        updatePomodoroUI();
        const pomodoroActions = document.getElementById('pomodoroActions');
        if (pomodoroActions) {
            pomodoroActions.style.display = 'none';
        }
        document.dispatchEvent(new CustomEvent('pomodoro-reset'));
    }


    function mutePomodoroAudio() {
        if (state.pomodoro.currentAudio) {
            state.pomodoro.currentAudio.pause();
        }
        state.pomodoro.isMutedThisCycle = true;
    }

    function snoozePomodoro() {
        if (state.pomodoro.currentAudio) {
            state.pomodoro.currentAudio.pause();
        }
        state.pomodoro.remainingSeconds += 300; // Add 5 minutes
        state.pomodoro.isSnoozing = true;
    }

    function endCycle() {
        state.pomodoro.isSnoozed = false;
        state.pomodoro.alarmPlaying = false;
        startNextPomodoroPhase(true);
        updatePomodoroDashboard();
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
        state.pomodoro.isOneMinuteWarningPlayed = false;
        state.pomodoro.lastMinuteSoundPlayed = false;
        state.pomodoro.isMutedThisCycle = false;
        state.pomodoro.isSnoozing = false;
        state.pomodoro.actionButtonsVisible = false;
        if (state.pomodoro.currentAudio) {
            state.pomodoro.currentAudio.pause();
            state.pomodoro.currentAudio = null;
        }
        const pomodoroActions = document.getElementById('pomodoroActions');
        if (pomodoroActions) {
            pomodoroActions.style.display = 'none';
        }

        if (playSoundOnStart && !state.pomodoro.isMuted) {
            playSound(settings.timerSound);
        }
        updatePomodoroDashboard();
        state.pomodoro.isRunning = true; // Auto-start the next cycle
    }

    function formatToHHMMSS(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function updatePomodoroDashboard() {
        const { phase, remainingSeconds, workDuration, shortBreakDuration, longBreakDuration, isRunning, hasStarted, isSnoozed } = state.pomodoro;

        // Update the time for all three displays
        pomodoroWorkDisplay.textContent = formatToHHMMSS(phase === 'work' ? remainingSeconds : workDuration * 60);
        pomodoroShortBreakDisplay.textContent = formatToHHMMSS(phase === 'shortBreak' ? remainingSeconds : shortBreakDuration * 60);
        pomodoroLongBreakDisplay.textContent = formatToHHMMSS(phase === 'longBreak' ? remainingSeconds : longBreakDuration * 60);

        // Reset all classes
        const allDisplays = [pomodoroWorkDisplay, pomodoroShortBreakDisplay, pomodoroLongBreakDisplay];
        allDisplays.forEach(display => display.classList.remove('active', 'paused', 'snoozed'));

        // Set class for the active phase
        const activeDisplay = phase === 'work' ? pomodoroWorkDisplay : (phase === 'shortBreak' ? pomodoroShortBreakDisplay : pomodoroLongBreakDisplay);

        if (isSnoozed) {
            activeDisplay.classList.add('snoozed');
        } else if (isRunning) {
            activeDisplay.classList.add('active');
        } else if (hasStarted) {
            activeDisplay.classList.add('paused');
        }

        // Update the main status title
        let statusText = "Work Session";
        if (phase === 'shortBreak') statusText = "Short Break";
        if (phase === 'longBreak') statusText = "Long Break";
        statusDisplay.textContent = statusText;
    }

    function updatePomodoroUI() {
        const mainControls = document.getElementById('pomodoro-main-controls');
        const alarmControls = document.getElementById('pomodoroAlarmControls');
        const toggleBtn = document.getElementById('togglePomodoroBtn');
        const resetBtn = document.getElementById('resetPomodoro');

        if (!mainControls) return; // Exit if the elements are not on the page

        // Main toggle button text
        toggleBtn.textContent = state.pomodoro.isRunning ? 'Pause' : 'Start';

        // Reset button visibility
        resetBtn.style.display = state.pomodoro.hasStarted ? 'inline-block' : 'none';

        // Control sets visibility
        mainControls.style.display = state.pomodoro.alarmPlaying ? 'none' : 'flex';
        alarmControls.style.display = state.pomodoro.alarmPlaying ? 'flex' : 'none';
    }

    // Shared Functions
    function playSound(soundFile) {
        if (!soundFile) return null;
        const audio = new Audio(`assets/Sounds/${soundFile}`);
        audio.volume = settings.volume || 1.0;
        audio.play().catch(e => {
            console.error("Error playing sound:", e);
            const failureMessage = document.getElementById('audio-failure-message');
            if (failureMessage) {
                failureMessage.classList.add('visible');
                setTimeout(() => {
                    failureMessage.classList.remove('visible');
                }, 5000);
            }
        });
        return audio;
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
        timerDaysInput.addEventListener('blur', normalizeTimerInputs);
        timerHoursInput.addEventListener('blur', normalizeTimerInputs);
        timerMinutesInput.addEventListener('blur', normalizeTimerInputs);
        timerSecondsInput.addEventListener('blur', normalizeTimerInputs);

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
        mutePomodoroBtn.addEventListener('click', mutePomodoroAudio);
        snoozePomodoroBtn.addEventListener('click', snoozePomodoro);
        nextCyclePomodoroBtn.addEventListener('click', endCycle);
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
        init: function(appSettings, initialState) {
            settings = appSettings;

            if (initialState) {
                // Restore state, ensuring timers aren't running on load
                if (initialState.timer) {
                    Object.assign(state.timer, initialState.timer);
                    state.timer.isRunning = false;
                }
                if (initialState.pomodoro) {
                    Object.assign(state.pomodoro, initialState.pomodoro);
                    state.pomodoro.isRunning = false;
                    state.pomodoro.alarmPlaying = false; // Ensure alarm isn't stuck on
                }
                if (initialState.stopwatch) {
                    Object.assign(state.stopwatch, initialState.stopwatch);
                    state.stopwatch.isRunning = false;
                }
            }

            setupAllEventListeners();
            updateLapDisplay();
            updateButtonStates();
            updatePomodoroDashboard();
            updatePomodoroUI();
        },
        update: function(deltaTime) {
            if (state.timer.isRunning) {
                state.timer.remainingSeconds -= deltaTime;
                if (state.timer.remainingSeconds <= 0) {
                    timerFinished();
                }

                // Update input fields in real-time
                const remaining = Math.max(0, state.timer.remainingSeconds);
                const days = Math.floor(remaining / 86400);
                const hours = Math.floor((remaining % 86400) / 3600);
                const minutes = Math.floor((remaining % 3600) / 60);
                const seconds = Math.floor(remaining % 60);

                timerDaysInput.value = days;
                timerHoursInput.value = hours;
                timerMinutesInput.value = minutes;
                timerSecondsInput.value = seconds;
            }
            if (state.pomodoro.isRunning && !state.pomodoro.alarmPlaying) {
                state.pomodoro.remainingSeconds -= deltaTime;

                const pomodoroActions = document.getElementById('pomodoroActions');
                if (state.pomodoro.remainingSeconds <= 60 && state.pomodoro.remainingSeconds >= 0) {
                    if (pomodoroActions.style.display === 'none') {
                        pomodoroActions.style.display = 'flex';
                    }
                    if (!state.pomodoro.lastMinuteSoundPlayed && !state.pomodoro.isMutedThisCycle) {
                        const audio = playSound(settings.timerSound);
                        if (audio) {
                            state.pomodoro.currentAudio = audio;
                        }
                        state.pomodoro.lastMinuteSoundPlayed = true;
                    }
                } else {
                    if (pomodoroActions.style.display === 'flex') {
                        pomodoroActions.style.display = 'none';
                    }
                }

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
            updatePomodoroDashboard(); // Keep display updated regardless of running state
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
