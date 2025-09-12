document.addEventListener('DOMContentLoaded', function() {
    // This is the main application orchestrator.
    // It's responsible for initializing all the modules and passing data between them.

    // 1. Initialize Settings: Load settings from localStorage and set up event listeners for settings controls.
    Settings.init();
    let settings = Settings.get();

    // 2. Load Application State: Load tool states and other app-wide states from localStorage.
    let appState = {
        mode: 'clock', // 'clock', 'timer', 'pomodoro', 'stopwatch'
        tools: {}, // This will hold the state for timer, pomodoro, stopwatch
        alarms: [] // For advanced alarms
    };

    const savedState = localStorage.getItem('polarClockState');
    if (savedState) {
        const loadedState = JSON.parse(savedState);
        // Safely merge the loaded state into our default structure, ensuring 'tools' is an object
        appState = { ...appState, ...loadedState };
        if (!appState.tools) {
            appState.tools = {};
        }
    }

    // 3. Initialize Modules
    // Clock module needs settings for rendering and the app state for displaying arcs.
    Clock.init(settings, appState);
    // UI module needs a reference to the Clock to pause/resume it.
    UI.init(Clock);
    // Tools module needs settings for sounds and the initial state for the tools.
    Tools.init(settings, appState.tools);

    // 4. Set up the main update loop (requestAnimationFrame)
    const digitalTime = document.getElementById('digitalTime');
    const digitalDate = document.getElementById('digitalDate');
    let lastFrameTime = 0;

    function update(timestamp) {
        const now = new Date();
        const deltaTime = (timestamp - (lastFrameTime || 0)) / 1000;
        lastFrameTime = timestamp;

        // Update the tools module (advances timers, etc.)
        Tools.update(deltaTime);

        // Update the digital clock display
        if (digitalTime) {
            digitalTime.textContent = now.toLocaleTimeString([], {
                hour12: !settings.is24HourFormat,
                hour: 'numeric',
                minute: '2-digit'
            });
        }
        if (digitalDate) {
            digitalDate.textContent = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
        }

        // Get the latest state from the tools module
        const latestToolState = Tools.getState();
        // Combine it with the app-level state
        const fullState = { ...appState, ...latestToolState };

        // Update the main clock display
        Clock.update(settings, fullState);

        // Continue the loop
        requestAnimationFrame(update);
    }

    // 5. Set up global event listeners for communication between modules
    function saveAppState() {
        // Get the latest state from tools and merge it before saving
        const latestToolState = Tools.getState();
        appState.tools = latestToolState;
        localStorage.setItem('polarClockState', JSON.stringify(appState));
    }

    document.addEventListener('modechange', (e) => {
        appState.mode = e.detail.mode;
        // No need to save state on mode change, it's not critical to persist immediately
    });

    // The 'statechange' event is fired by Tools whenever its state changes
    document.addEventListener('statechange', saveAppState);

    // The 'settings-requires-resize' event is fired by Settings when a change requires a clock redraw
    document.addEventListener('settings-requires-resize', () => {
        if (Clock && typeof Clock.resize === 'function') {
            Clock.resize();
        }
    });

    // A generic event for when a setting changes that doesn't require a resize but needs to be re-fetched.
    document.addEventListener('settings-changed', () => {
        settings = Settings.get();
    });

    // 6. Start the application
    requestAnimationFrame(update);

    // A small delay to ensure the canvas has been sized correctly by the browser's layout engine.
    setTimeout(() => {
        if (Clock && typeof Clock.resize === 'function') {
            Clock.resize();
        }
    }, 100);
});
