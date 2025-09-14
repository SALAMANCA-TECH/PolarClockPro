document.addEventListener('DOMContentLoaded', function() {
    // This is the main application orchestrator.
    // It's responsible for initializing all the modules and passing data between them.

    // --- 1. INITIALIZATION ---
    // Initialize all modules from the start to ensure a responsive UI.
    Settings.init();
    let settings = Settings.get();

    let appState = {
        mode: 'clock',
        tools: {},
        alarms: []
    };
    const savedState = localStorage.getItem('polarClockState');
    if (savedState) {
        const loadedState = JSON.parse(savedState);
        appState = { ...appState, ...loadedState };
        if (!appState.tools) appState.tools = {};
    }

    Clock.init(settings, appState);
    UI.init();
    Tools.init(settings, appState.tools);
    Clock.pause(); // Start with the clock paused

    // --- 2. MAIN UPDATE LOOP (to be started after animation) ---
    const digitalTime = document.getElementById('digitalTime');
    const digitalDate = document.getElementById('digitalDate');
    let lastFrameTime = 0;

    function update(timestamp) {
        const now = new Date();
        const deltaTime = (timestamp - (lastFrameTime || 0)) / 1000;
        lastFrameTime = timestamp;

        Tools.update(deltaTime);

        if (digitalTime) {
            digitalTime.textContent = now.toLocaleTimeString([], { hour12: !settings.is24HourFormat, hour: 'numeric', minute: '2-digit' });
        }
        if (digitalDate) {
            digitalDate.textContent = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
        }

        const latestToolState = Tools.getState();
        const fullState = { ...appState, ...latestToolState };

        // Use the regular update, without overrides
        Clock.update(settings, fullState, null);
        Clock.resume();

        requestAnimationFrame(update);
    }

    // --- 3. GLOBAL EVENT LISTENERS ---
    function saveAppState() {
        const latestToolState = Tools.getState();
        appState.tools = latestToolState;
        localStorage.setItem('polarClockState', JSON.stringify(appState));
    }

    document.addEventListener('modechange', (e) => { appState.mode = e.detail.mode; });
    document.addEventListener('statechange', saveAppState);
    document.addEventListener('settings-requires-resize', () => { if (Clock && typeof Clock.resize === 'function') Clock.resize(); });
    document.addEventListener('settings-changed', () => { settings = Settings.get(); });

    // --- 4. STARTUP ANIMATION ---
    function runStartupAnimation() {
        // --- Phase 0: Apply and save initial settings ---
        // This is the state the clock will be in after the animation.
        settings.colorPreset = 'Default';
        settings.showArcEndCircles = false; // Off for animation
        Object.keys(settings.arcVisibility).forEach(k => settings.arcVisibility[k] = true);

        // We need to manually trigger the necessary updates that would
        // normally happen via event listeners in the settings panel.
        Settings.save(); // Custom function to save current settings state
        Settings.applyToUI(); // Custom function to update UI from settings state
        Clock.resize(); // Recalculate dimensions based on new visibility

        const targetTime = new Date(); // Capture target time once
        let animationStartTime = performance.now();

        const animationOrder = ['dayOfWeek', 'month', 'day', 'hours', 'minutes', 'seconds', 'weekOfYear'];
        const fillDuration = 1000; // 1s to fill
        const settleDuration = 1000; // 1s to settle
        const staggerDelay = 500; // 0.5s between each arc

        const totalDuration = staggerDelay * animationOrder.length + fillDuration + settleDuration;

        function animationLoop(now) {
            const elapsed = now - animationStartTime;

            let progressOverrides = {};
            const nowForAngles = new Date(); // Use a single 'now' for all calculations in this frame

            // --- Phase 1 & 2: Fill & Settle ---
            for (let i = 0; i < animationOrder.length; i++) {
                const arcKey = animationOrder[i];
                const arcStartTime = staggerDelay * i;

                if (elapsed >= arcStartTime) {
                    const arcElapsed = elapsed - arcStartTime;

                    // Fill phase
                    const fillProgress = Math.min(arcElapsed / fillDuration, 1);

                    // Settle phase
                    let settleProgress = 0;
                    if (fillProgress >= 1) {
                        const settleStartTimeForArc = arcStartTime + fillDuration;
                        const settleElapsed = elapsed - settleStartTimeForArc;
                        settleProgress = Math.min(settleElapsed / settleDuration, 1);
                    }

                    progressOverrides[arcKey] = {
                        fill: fillProgress,
                        settle: settleProgress
                    };
                }
            }

            // Update clock with animation state
            Clock.update(settings, appState, progressOverrides, targetTime);

            if (elapsed < totalDuration) {
                requestAnimationFrame(animationLoop);
            } else {
                // --- Phase 3: Finalization ---
                settings.showArcEndCircles = true;
                Settings.save();
                Settings.applyToUI();

                // Draw one final frame with circles
                Clock.update(settings, appState, null, targetTime);

                // Start the main update loop
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(animationLoop);
    }

    // --- 5. START THE APPLICATION ---
    runStartupAnimation();
});
