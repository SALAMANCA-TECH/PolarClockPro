const Clock = (function() {
    const canvas = document.getElementById('polarClockCanvas');
    if (!canvas) { return; }
    const ctx = canvas.getContext('2d');

    let settings = {};
    let globalState = {};
    let dimensions = {};
    const baseStartAngle = -Math.PI / 2;
    let lastNow = new Date();
    let isFirstFrameDrawn = false;
    let animationFrameId = null;

    const drawArc = (x, y, radius, startAngle, endAngle, colorLight, colorDark, lineWidth) => {
        if (startAngle >= endAngle - 0.01 || radius <= 0) return;

        let strokeStyle;
        if (settings.colorPreset === 'candy') {
            // Create a gradient that gives a glossy, 3D effect
            const innerRadius = radius - lineWidth / 2;
            const outerRadius = radius + lineWidth / 2;
            const gradient = ctx.createLinearGradient(x - innerRadius, y - innerRadius, x + outerRadius, y + outerRadius);

            // Adding a bright highlight and a subtle shadow
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); // Top-left highlight
            gradient.addColorStop(0.5, colorLight); // Main color
            gradient.addColorStop(1, colorDark); // Bottom-right shadow

            strokeStyle = gradient;
        } else {
            const useGradient = settings && settings.useGradient;
            if (useGradient) {
                const gradient = ctx.createConicGradient(baseStartAngle, x, y);
                gradient.addColorStop(0, colorLight);
                gradient.addColorStop(1, colorDark);
                strokeStyle = gradient;
            } else {
                strokeStyle = colorLight;
            }
        }

        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    };

    const drawLabel = (arc) => {
        const textX = dimensions.centerX;
        const textY = dimensions.centerY + arc.radius;

        let fontSizeMultiplier = 0.4;
        let circleSizeMultiplier = 0.5;
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

    const drawSeparators = (radius, count, arcLineWidth) => {
        if (!radius || radius <= 0) return;

        const innerRadius = radius - (arcLineWidth / 2);
        const outerRadius = radius + (arcLineWidth / 2);
        const sixOClockAngle = baseStartAngle + Math.PI;

        ctx.strokeStyle = '#121212'; // Background color for "cutout" effect
        ctx.lineWidth = 2; // Separator line width

        const divisions = (count === 60) ? 12 : count;
        const step = (count === 60) ? 5 : 1;

        for (let i = 0; i < divisions; i++) {
            const index = i * step;
            const angle = baseStartAngle + (index / count) * Math.PI * 2;

            // Skip the 6 o'clock position with a small tolerance
            if (Math.abs(angle - sixOClockAngle) < 0.01) {
                continue;
            }

            const startX = dimensions.centerX + Math.cos(angle) * innerRadius;
            const startY = dimensions.centerY + Math.sin(angle) * innerRadius;
            const endX = dimensions.centerX + Math.cos(angle) * outerRadius;
            const endY = dimensions.centerY + Math.sin(angle) * outerRadius;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    };

    const drawRulerSeparators = (radius, count, arcLineWidth) => {
        if (!radius || radius <= 0) return;

        const centerlineRadius = radius;
        const fullInnerRadius = radius - (arcLineWidth / 2);
        const fullOuterRadius = radius + (arcLineWidth / 2);
        const sixOClockAngle = baseStartAngle + Math.PI;

        ctx.strokeStyle = '#121212'; // Background color for "cutout" effect

        for (let i = 0; i < count; i++) {
            const angle = baseStartAngle + (i / count) * Math.PI * 2;

            if (Math.abs(angle - sixOClockAngle) < 0.01) {
                continue;
            }

            const isMajorTick = i % 5 === 0;

            // For minor ticks, start from the centerline. For major ticks, use the full inner radius.
            const innerRadius = isMajorTick ? fullInnerRadius : centerlineRadius;
            // All ticks extend to the full outer radius.
            const outerRadius = fullOuterRadius;

            ctx.lineWidth = isMajorTick ? 2.5 : 1.5;

            const startX = dimensions.centerX + Math.cos(angle) * innerRadius;
            const startY = dimensions.centerY + Math.sin(angle) * innerRadius;
            const endX = dimensions.centerX + Math.cos(angle) * outerRadius;
            const endY = dimensions.centerY + Math.sin(angle) * outerRadius;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getDayOfWeek = (date) => {
        // Monday is 1, Sunday is 7
        const day = date.getDay();
        return day === 0 ? 7 : day;
    };

    const getTotalWeeksInYear = (year) => {
        const date = new Date(year, 11, 28); // December 28th is always in the last week of the year
        return getWeekOfYear(date);
    };

    const getWeekOfYear = (date) => {
        const start = new Date(date.getFullYear(), 0, 1);
        const diff = (date - start) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
        const oneDay = 1000 * 60 * 60 * 24;
        const day = Math.floor(diff / oneDay);
        return Math.ceil((day + 1) / 7);
    };

    const getLabelText = (unit, now) => {
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds(), milliseconds = now.getMilliseconds();
        const daysInMonth = getDaysInMonth(year, month);
        const dayOfWeek = getDayOfWeek(now);
        const weekOfYear = getWeekOfYear(now);
        const totalWeeks = getTotalWeeksInYear(year);

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
                if (unit === 'dayOfWeek') percent = (dayOfWeek / 7) * 100;
                if (unit === 'weekOfYear') percent = (weekOfYear / totalWeeks) * 100;
                return `${Math.floor(percent)}%`;
            case 'remainder':
                if (unit === 'seconds') return 59 - seconds;
                if (unit === 'minutes') return 59 - minutes;
                if (unit === 'hours') return 11 - (hours % 12);
                if (unit === 'day') return daysInMonth - date;
                if (unit === 'month') return 11 - month;
                if (unit === 'dayOfWeek') return 7 - dayOfWeek;
                if (unit === 'weekOfYear') return totalWeeks - weekOfYear;
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
                if (unit === 'dayOfWeek') return dayOfWeek.toString();
                if (unit === 'weekOfYear') return weekOfYear.toString();
                return '';
        }
    };

    const drawClock = () => {
        if (!settings.currentColors || !globalState.timer) {
            return;
        }

        const now = new Date();
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
        const dayOfWeek = getDayOfWeek(now);
        const daysInMonth = getDaysInMonth(year, month);
        const weekOfYear = getWeekOfYear(now);
        const totalWeeks = getTotalWeeksInYear(year);

        const dayOfWeekEndAngle = baseStartAngle + (dayOfWeek / 7) * Math.PI * 2;
        const monthEndAngle = baseStartAngle + ((month + date / daysInMonth) / 12) * Math.PI * 2;
        const dayEndAngle = baseStartAngle + ((date - 1 + (hours + minutes / 60) / 24) / daysInMonth) * Math.PI * 2;
        const hoursEndAngle = baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;
        const minutesEndAngle = baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
        const secondsEndAngle = baseStartAngle + ((seconds + now.getMilliseconds() / 1000) / 60) * Math.PI * 2;
        const weekOfYearEndAngle = baseStartAngle + (weekOfYear / totalWeeks) * Math.PI * 2;

        // Arcs are now always defined and drawn
        const arcs = [
            { key: 'dayOfWeek', radius: dimensions.dayOfWeekRadius, colors: settings.currentColors.dayOfWeek, lineWidth: dimensions.dayOfWeekLineWidth, endAngle: dayOfWeekEndAngle },
            { key: 'month', radius: dimensions.monthRadius, colors: settings.currentColors.month, lineWidth: dimensions.monthLineWidth, endAngle: monthEndAngle },
            { key: 'day', radius: dimensions.dayRadius, colors: settings.currentColors.day, lineWidth: dimensions.dayLineWidth, endAngle: dayEndAngle },
            { key: 'hours', radius: dimensions.hoursRadius, colors: settings.currentColors.hours, lineWidth: dimensions.hoursLineWidth, endAngle: hoursEndAngle },
            { key: 'minutes', radius: dimensions.minutesRadius, colors: settings.currentColors.minutes, lineWidth: dimensions.minutesLineWidth, endAngle: minutesEndAngle },
            { key: 'seconds', radius: dimensions.secondsRadius, colors: settings.currentColors.seconds, lineWidth: dimensions.secondsLineWidth, endAngle: secondsEndAngle },
            { key: 'weekOfYear', radius: dimensions.weekOfYearRadius, colors: settings.currentColors.weekOfYear, lineWidth: dimensions.weekOfYearLineWidth, endAngle: weekOfYearEndAngle }
        ];

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

        // --- Draw Separators ---
        if (settings.showSeparators) {
            const isRulerMode = settings.separatorMode === 'ruler';

            // Ruler mode only applies to minutes and seconds
            if (isRulerMode) {
                drawRulerSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth);
                drawRulerSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth);
            } else {
                drawSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth);
                drawSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth);
            }

            // Other arcs always use standard separators
            drawSeparators(dimensions.hoursRadius, 12, dimensions.hoursLineWidth);
            drawSeparators(dimensions.dayRadius, daysInMonth, dimensions.dayLineWidth);
            drawSeparators(dimensions.monthRadius, 12, dimensions.monthLineWidth);
            drawSeparators(dimensions.dayOfWeekRadius, 7, dimensions.dayOfWeekLineWidth);
            drawSeparators(dimensions.weekOfYearRadius, getTotalWeeksInYear(now.getFullYear()), dimensions.weekOfYearLineWidth);
        }

        lastNow = now;

        if (!isFirstFrameDrawn && dimensions.secondsRadius > 0) {
            isFirstFrameDrawn = true;
            canvas.dispatchEvent(new CustomEvent('clockready', { bubbles: true }));
        }
    };

    const drawStopwatch = () => {
        if (!settings.currentColors || !globalState.stopwatch) {
            return;
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

    const drawPomodoro = () => {
        if (!settings.currentColors || !globalState.pomodoro) {
            return;
        }

        const { phase, remainingSeconds } = globalState.pomodoro;

        // Determine total duration for the current phase from the state object
        const { workDuration, shortBreakDuration, longBreakDuration } = globalState.pomodoro;

        let totalDuration;
        if (phase === 'work') {
            totalDuration = workDuration * 60;
        } else if (phase === 'shortBreak') {
            totalDuration = shortBreakDuration * 60;
        } else { // longBreak
            totalDuration = longBreakDuration * 60;
        }

        // Calculate remaining time components
        const remaining = Math.max(0, remainingSeconds);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);
        const milliseconds = (remaining - Math.floor(remaining));

        // Define arcs based on remaining time
        const arcs = [];

        // Only show hours arc if total duration is an hour or more
        if (totalDuration >= 3600) {
            const hoursProgress = (hours + (minutes / 60) + (seconds / 3600)) / 12; // Progress for a 12h clock
            const hoursEndAngle = baseStartAngle + hoursProgress * Math.PI * 2;
            arcs.push({
                key: 'hours',
                radius: dimensions.hoursRadius,
                colors: settings.currentColors.hours,
                lineWidth: dimensions.hoursLineWidth,
                startAngle: baseStartAngle,
                endAngle: hoursEndAngle,
                text: hours.toString().padStart(2, '0')
            });
        }

        const minutesProgress = (minutes + (seconds / 60) + (milliseconds / 60)) / 60;
        const minutesEndAngle = baseStartAngle + minutesProgress * Math.PI * 2;
        arcs.push({
            key: 'minutes',
            radius: dimensions.minutesRadius,
            colors: settings.currentColors.minutes,
            lineWidth: dimensions.minutesLineWidth,
            startAngle: baseStartAngle,
            endAngle: minutesEndAngle,
            text: minutes.toString().padStart(2, '0')
        });

        const secondsProgress = (seconds + milliseconds) / 60;
        const secondsEndAngle = baseStartAngle + secondsProgress * Math.PI * 2;
        arcs.push({
            key: 'seconds',
            radius: dimensions.secondsRadius,
            colors: settings.currentColors.seconds,
            lineWidth: dimensions.secondsLineWidth,
            startAngle: baseStartAngle,
            endAngle: secondsEndAngle,
            text: seconds.toString().padStart(2, '0')
        });

        // Draw the arcs and their labels
        arcs.forEach(arc => {
            if (arc.radius > 0 && settings.currentColors) {
                drawArc(dimensions.centerX, dimensions.centerY, arc.radius, arc.startAngle, arc.endAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
                drawLabel({ ...arc, text: arc.text });
            }
        });

        // Draw separators if enabled
        if (settings.showSeparators) {
            const isRulerMode = settings.separatorMode === 'ruler';

            // Hour separators are always standard
            if (totalDuration >= 3600) {
                drawSeparators(dimensions.hoursRadius, 12, dimensions.hoursLineWidth);
            }

            // Apply ruler mode only to minutes and seconds
            if (isRulerMode) {
                drawRulerSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth);
                drawRulerSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth);
            } else {
                drawSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth);
                drawSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth);
            }
        }
    };

    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (globalState.mode === 'pomodoro') {
            drawPomodoro();
        } else if (globalState.mode === 'stopwatch') {
            drawStopwatch();
        } else {
            drawClock();
        }
        animationFrameId = requestAnimationFrame(animate);
    };

    const publicInterface = {
        init: function(initialSettings, initialState) {
            settings = initialSettings;
            globalState = initialState;
            window.addEventListener('resize', () => this.resize());
            this.resume();
        },
        pause: function() {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        },
        resume: function() {
            if (!animationFrameId) {
                lastNow = new Date();
                animate();
            }
        },
        resize: function() {
            if (!canvas) return;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            dimensions.centerX = canvas.width / 2;
            dimensions.centerY = canvas.height / 2;

            const baseRadius = Math.min(dimensions.centerX, dimensions.centerY) * 0.9;
            const renderedLineWidth = (6 / 57) * baseRadius;
            const renderedGap = (1.875 / 57) * baseRadius;

            let currentRadius = baseRadius;

            // Outermost arc: Week of the Year
            dimensions.weekOfYearLineWidth = renderedLineWidth;
            dimensions.weekOfYearRadius = currentRadius - (dimensions.weekOfYearLineWidth / 2);
            currentRadius -= (dimensions.weekOfYearLineWidth + renderedGap);

            // Seconds
            dimensions.secondsLineWidth = renderedLineWidth;
            dimensions.secondsRadius = currentRadius - (dimensions.secondsLineWidth / 2);
            currentRadius -= (dimensions.secondsLineWidth + renderedGap);

            // Minutes
            dimensions.minutesLineWidth = renderedLineWidth;
            dimensions.minutesRadius = currentRadius - (dimensions.minutesLineWidth / 2);
            currentRadius -= (dimensions.minutesLineWidth + renderedGap);

            // Hours
            dimensions.hoursLineWidth = renderedLineWidth;
            dimensions.hoursRadius = currentRadius - (dimensions.hoursLineWidth / 2);
            currentRadius -= (dimensions.hoursLineWidth + renderedGap);

            // Day of the Month
            dimensions.dayLineWidth = renderedLineWidth;
            dimensions.dayRadius = currentRadius - (dimensions.dayLineWidth / 2);
            currentRadius -= (dimensions.dayLineWidth + renderedGap);

            // Month of the Year
            dimensions.monthLineWidth = renderedLineWidth;
            dimensions.monthRadius = currentRadius - (dimensions.monthLineWidth / 2);
            currentRadius -= (dimensions.monthLineWidth + renderedGap);

            // Innermost arc: Day of the Week
            dimensions.dayOfWeekLineWidth = renderedLineWidth;
            dimensions.dayOfWeekRadius = currentRadius - (dimensions.dayOfWeekLineWidth / 2);
        },
        update: function(newSettings, newState) {
            settings = newSettings;
            globalState = newState;
            this.resume();
        }
    };

    return publicInterface;
})();
