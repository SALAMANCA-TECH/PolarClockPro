document.addEventListener('DOMContentLoaded', function() {
    const settingsClockCanvas = document.getElementById('settingsClockCanvas');
    if (!settingsClockCanvas) return;

    // 1. Initialize Settings and Clock
    Settings.init();
    let settings = Settings.get();

    const clock = new Clock(settingsClockCanvas);

    // 2. Set up the static time
    const staticTime = new Date(2022, 9, 23, 20, 37, 27); // Sunday, October 23rd, 2022 at 8:37:27pm

    let appState = {
        mode: 'clock',
        staticTime: staticTime,
        timer: {} // Add a dummy timer object to avoid errors
    };

    clock.init(settings, appState);


    // 3. Redraw clock when settings change
    document.addEventListener('settings-changed', () => {
        settings = Settings.get();
        clock.update(settings, appState);
    });

    document.addEventListener('settings-requires-resize', () => {
        clock.resize();
    });

    // Initial draw
    clock.update(settings, appState);

    // Update digital display with static time
    const digitalTime = document.getElementById('digitalTime');
    const digitalDate = document.getElementById('digitalDate');
    if (digitalTime) {
        digitalTime.textContent = staticTime.toLocaleTimeString([], {
            hour12: !settings.is24HourFormat,
            hour: 'numeric',
            minute: '2-digit'
        });
    }
    if (digitalDate) {
        digitalDate.textContent = `${staticTime.getFullYear()}/${(staticTime.getMonth() + 1).toString().padStart(2, '0')}/${staticTime.getDate().toString().padStart(2, '0')}`;
    }
});
