/**
 * clock.js: A dedicated module for rendering the Polar Clock.
 * This module encapsulates all canvas drawing, resizing, and animation logic
 * to ensure the clock is a stable, self-contained visual component.
 */
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('polarClockCanvas');
    if (!canvas) { return; }
    const ctx = canvas.getContext('2d');
    
    // --- MODULE-SCOPED VARIABLES ---
    let settings = {};
    let globalState = {}; 

    let dimensions = {};
    const baseStartAngle = -Math.PI / 2;
    let lastNow = new Date();
    let isFirstFrameDrawn = false;

    const drawArc = (x, y, radius, startAngle, endAngle, colorLight, colorDark, lineWidth) => {
        if (startAngle >= endAngle - 0.01 || radius <= 0) return;
        const useGradient = settings && settings.useGradient;
        const gradient = ctx.createConicGradient(baseStartAngle, x, y);
        gradient.addColorStop(0, colorLight);
        gradient.addColorStop(1, colorDark);
        ctx.strokeStyle = useGradient ? gradient : colorLight;
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    };

    const drawLabel = (arc) => {
        const textX = dimensions.centerX;
        const textY = dimensions.centerY + arc.radius;
        
        let fontSizeMultiplier = (arc.key === 'month') ? 0.8 : 0.6;
        let circleSizeMultiplier = (arc.key === 'month') ? 0.85 : 0.7;
        if (settings.labelDisplayMode === 'percentage') fontSizeMultiplier *= 0.85; 

        const circleRadius = arc.lineWidth * circleSizeMultiplier;
        ctx.beginPath();
        ctx.arc(textX, textY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(textX, textY, circleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${arc.lineWidth * fontSizeMultiplier}px Bahnschrift`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(arc.text, textX, textY);
    };
    
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

    const getLabelText = (unit, now) => {
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds(), milliseconds = now.getMilliseconds();
        const daysInMonth = getDaysInMonth(year, month);

        switch (settings.labelDisplayMode) {
            case 'percentage':
                let percent = 0;
                const totalMsInDay = 86400000;
                const currentMsInDay = (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
                if (unit === 'seconds') percent = (seconds * 1000 + milliseconds) / 60000 * 100;
                if (unit === 'minutes') percent = (minutes * 60000 + seconds * 1000 + milliseconds) / 3600000 * 100;
                if (unit === 'hours') percent = ((hours % 12) * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds) / 43200000 * 100;
                if (unit === 'day') percent = ((date - 1) * totalMsInDay + currentMsInDay) / (daysInMonth * totalMsInDay) * 100;
                if (unit === 'month') percent = (month + ((date - 1) * totalMsInDay + currentMsInDay) / (daysInMonth * totalMsInDay)) / 12 * 100;
                return `${Math.floor(percent)}%`;
            case 'remainder':
                if (unit === 'seconds') return 59 - seconds;
                if (unit === 'minutes') return 59 - minutes;
                if (unit === 'hours') return 11 - (hours % 12);
                if (unit === 'day') return daysInMonth - date;
                if (unit === 'month') return 11 - month;
                return '';
            default: // standard
                if (unit === 'seconds') return seconds.toString().padStart(2, '0');
                if (unit === 'minutes') return minutes.toString().padStart(2, '0');
                if (unit === 'hours') {
                    if (settings.is24HourFormat) {
                        return hours.toString().padStart(2, '0');
                    } else {
                        return (hours % 12 || 12).toString();
                    }
                }
                if (unit === 'day') return date.toString();
                if (unit === 'month') return (month + 1).toString().padStart(2, '0');
                return '';
        }
    };

    const drawClock = () => {
        // --- FIX: Add guard clauses to prevent drawing before state is ready. ---
        if (!settings.currentColors || !globalState.timer) {
            return; // Exit if settings or state are not yet initialized
        }

        const now = new Date();
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
        const daysInMonth = getDaysInMonth(year, month);

        const monthEndAngle = baseStartAngle + ((month + date / daysInMonth) / 12) * Math.PI * 2;
        const dayEndAngle = baseStartAngle + ((date - 1 + (hours + minutes / 60) / 24) / daysInMonth) * Math.PI * 2;
        const hoursEndAngle = baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;
        const minutesEndAngle = baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
        const secondsEndAngle = baseStartAngle + ((seconds + now.getMilliseconds() / 1000) / 60) * Math.PI * 2;
        
        const arcs = [];

        if (settings.showDateLines) {
            arcs.push({ key: 'month', radius: dimensions.monthRadius, colors: settings.currentColors.month, lineWidth: 20, endAngle: monthEndAngle });
            arcs.push({ key: 'day', radius: dimensions.dayRadius, colors: settings.currentColors.day, lineWidth: 30, endAngle: dayEndAngle });
        }

        if (settings.showTimeLines) {
            arcs.push({ key: 'hours', radius: dimensions.hoursRadius, colors: settings.currentColors.hours, lineWidth: 45, endAngle: hoursEndAngle });
        }

        arcs.push({ key: 'minutes', radius: dimensions.minutesRadius, colors: settings.currentColors.minutes, lineWidth: 30, endAngle: minutesEndAngle });
        arcs.push({ key: 'seconds', radius: dimensions.secondsRadius, colors: settings.currentColors.seconds, lineWidth: 30, endAngle: secondsEndAngle });

        drawTrackedAlarmTimer(now);
        if (globalState.timer && globalState.timer.totalSeconds > 0 && dimensions.timerRadius > 0) {
            const timerProgress = globalState.timer.remainingSeconds / globalState.timer.totalSeconds;
            const timerStartAngle = baseStartAngle + (1 - timerProgress) * Math.PI * 2;
            drawArc(dimensions.centerX, dimensions.centerY, dimensions.timerRadius, timerStartAngle, baseStartAngle + Math.PI * 2, '#FF8A80', '#D50000', 30);
        }
        arcs.forEach(arc => {
            if (arc.radius > 0 && settings.currentColors) {
                drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, arc.endAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
                arc.text = getLabelText(arc.key, now);
                drawLabel(arc);
            }
        });
        
        lastNow = now;

        if (!isFirstFrameDrawn && dimensions.secondsRadius > 0) {
            isFirstFrameDrawn = true;
            canvas.dispatchEvent(new CustomEvent('clockready', { bubbles: true }));
        }
    };

    const drawStopwatch = () => {
        // --- FIX: Add guard clauses to prevent drawing before state is ready. ---
        if (!settings.currentColors || !globalState.stopwatch) {
            return; // Exit if settings or state are not yet initialized
        }
        
        const time = new Date(globalState.stopwatch.elapsedTime);
        const milliseconds = time.getUTCMilliseconds();
        const seconds = time.getUTCSeconds();
        const minutes = time.getUTCMinutes();
        const hours = time.getUTCHours();

        const secondsEndAngle = baseStartAngle + ((seconds + milliseconds / 1000) / 60) * Math.PI * 2;
        const minutesEndAngle = baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
        const hoursEndAngle = baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;

        const arcs = [
            { key: 'hours', radius: dimensions.hoursRadius, colors: settings.currentColors.hours, lineWidth: 45, endAngle: hoursEndAngle, text: hours.toString().padStart(2, '0') },
            { key: 'minutes', radius: dimensions.minutesRadius, colors: settings.currentColors.minutes, lineWidth: 30, endAngle: minutesEndAngle, text: minutes.toString().padStart(2, '0') },
            { key: 'seconds', radius: dimensions.secondsRadius, colors: settings.currentColors.seconds, lineWidth: 30, endAngle: secondsEndAngle, text: seconds.toString().padStart(2, '0') }
        ];

        arcs.forEach(arc => {
            if (arc.radius > 0 && settings.currentColors) {
                drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, arc.endAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
                drawLabel(arc);
            }
        });
    };

    function drawTrackedAlarmTimer(now) {
        // ... drawing logic for tracked alarm ...
    }

    let animationFrameId = null;
    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (globalState.mode === 'stopwatch') {
            drawStopwatch();
        } else {
            drawClock();
        }
        animationFrameId = requestAnimationFrame(animate);
    };

    const ClockModule = {
        init(initialSettings, initialState) {
            settings = initialSettings;
            globalState = initialState;
            // this.resize(); // This is called prematurely, causing the bug. It's now called from main.js at the correct time.
            window.addEventListener('resize', () => this.resize());
            this.resume();
        },
        pause() {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        },
        resume() {
            if (!animationFrameId) {
                lastNow = new Date(); // Reset time to avoid a jump
                animate();
            }
        },
        resize() {
            if (!canvas) return;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            dimensions.centerX = canvas.width / 2;
            dimensions.centerY = canvas.height / 2;

            const baseRadius = Math.min(dimensions.centerX, dimensions.centerY) * 0.9;
            const monthLineWidth = 20;
            const dayLineWidth = 30;
            const hourLineWidth = 45;
            const minuteLineWidth = 30;
            const secondLineWidth = 30;
            const timerLineWidth = 30;
            const alarmLineWidth = 20;
            const gap = 15;

            let totalWidth = secondLineWidth / 2;
            totalWidth += minuteLineWidth + gap;
            if (settings.showTimeLines) {
                totalWidth += hourLineWidth + gap;
            }
            if (settings.showDateLines) {
                totalWidth += dayLineWidth + gap;
                totalWidth += monthLineWidth + gap;
            }
            if (globalState.timer && globalState.timer.totalSeconds > 0) totalWidth += timerLineWidth + gap;
            if (globalState.trackedAlarm && globalState.trackedAlarm.nextAlarmTime) totalWidth += alarmLineWidth + gap;


            const scale = baseRadius / totalWidth;

            let currentRadius = baseRadius;

            dimensions.secondsRadius = currentRadius - (secondLineWidth / 2) * scale;
            currentRadius -= (secondLineWidth + gap) * scale;

            dimensions.minutesRadius = currentRadius - (minuteLineWidth / 2) * scale;
            currentRadius -= (minuteLineWidth + gap) * scale;

            dimensions.hoursRadius = currentRadius - (hourLineWidth / 2) * scale;
            currentRadius -= (hourLineWidth + gap) * scale;

            if (settings.showDateLines) {
                dimensions.dayRadius = currentRadius - (dayLineWidth / 2) * scale;
                currentRadius -= (dayLineWidth + gap) * scale;
                dimensions.monthRadius = currentRadius - (monthLineWidth / 2) * scale;
                currentRadius -= (monthLineWidth + gap) * scale;
            } else {
                dimensions.dayRadius = 0;
                dimensions.monthRadius = 0;
            }

            if (globalState.timer && globalState.timer.totalSeconds > 0) {
                dimensions.timerRadius = currentRadius - (timerLineWidth / 2) * scale;
                currentRadius -= (timerLineWidth + gap) * scale;
            } else {
                dimensions.timerRadius = 0;
            }

            if (globalState.trackedAlarm && globalState.trackedAlarm.nextAlarmTime) {
                dimensions.trackedAlarmRadius = currentRadius - (alarmLineWidth / 2) * scale;
            } else {
                dimensions.trackedAlarmRadius = 0;
            }
        },
        update(newSettings, newState) {
            settings = newSettings;
            globalState = newState;
            // --- FIX: Ensure the animation loop is running every time state is updated. ---
            this.resume();
        }
    };
    window.ClockModule = ClockModule;
});

