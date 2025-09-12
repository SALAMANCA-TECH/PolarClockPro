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
    let resetAnimations = {};
    const animationDuration = 1500; // 1.5 seconds

    const hasCompletedCycle = (unit, now, lastNow) => {
        switch (unit) {
            case 'seconds':
                return lastNow.getSeconds() === 59 && now.getSeconds() === 0;
            case 'minutes':
                return lastNow.getMinutes() === 59 && now.getMinutes() === 0;
            case 'hours':
                if (settings.is24HourFormat) {
                    return lastNow.getHours() === 23 && now.getHours() === 0;
                } else {
                    // This handles the 12-hour cycle (e.g., 11 AM -> 12 PM or 11 PM -> 12 AM)
                    const lastHour12 = lastNow.getHours() % 12;
                    const nowHour12 = now.getHours() % 12;
                    // Rollover happens when last hour was 11 and current is 0 (midnight/noon)
                    return lastHour12 === 11 && nowHour12 === 0;
                }
            case 'day':
                return now.getDate() === 1 && lastNow.getDate() > 1;
            case 'month':
                return now.getMonth() === 0 && lastNow.getMonth() === 11;
            case 'dayOfWeek':
                return getDayOfWeek(now) === 1 && getDayOfWeek(lastNow) === 7;
            case 'weekOfYear':
                return getWeekOfYear(now) === 1 && getWeekOfYear(lastNow) > 1;
            default:
                return false;
        }
    };

    const drawTimer = () => {
        if (!settings.currentColors || !globalState.timer) {
            return;
        }

        const { remainingSeconds, totalSeconds } = globalState.timer;

        // If the timer hasn't started, draw empty arcs
        if (totalSeconds === 0) {
            const emptyArcs = [
                { key: 'hours', radius: dimensions.hoursRadius, colors: settings.currentColors.hours, lineWidth: dimensions.hoursLineWidth, text: '00' },
                { key: 'minutes', radius: dimensions.minutesRadius, colors: settings.currentColors.minutes, lineWidth: dimensions.minutesLineWidth, text: '00' },
                { key: 'seconds', radius: dimensions.secondsRadius, colors: settings.currentColors.seconds, lineWidth: dimensions.secondsLineWidth, text: '00' }
            ];
            emptyArcs.forEach(arc => {
                 if (arc.radius > 0) {
                    drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, baseStartAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
                    drawLabel({ ...arc, text: arc.text });
                 }
            });
            return;
        }


        const remaining = Math.max(0, remainingSeconds);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);

        // Inverse fill: arcs shrink as time passes.
        const hoursProgress = (hours + (minutes / 60) + (seconds / 3600)) / (totalSeconds / 3600);
        const minutesProgress = (minutes + (seconds / 60)) / 60;
        const secondsProgress = seconds / 60;

        const hoursStartAngle = baseStartAngle + (1 - hoursProgress) * Math.PI * 2;
        const minutesStartAngle = baseStartAngle + (1 - minutesProgress) * Math.PI * 2;
        const secondsStartAngle = baseStartAngle + (1 - secondsProgress) * Math.PI * 2;
        const fullCircleEndAngle = baseStartAngle + Math.PI * 2;


        const arcs = [
            { key: 'hours', radius: dimensions.hoursRadius, colors: settings.currentColors.hours, lineWidth: dimensions.hoursLineWidth, startAngle: hoursStartAngle, endAngle: fullCircleEndAngle, text: hours.toString().padStart(2, '0') },
            { key: 'minutes', radius: dimensions.minutesRadius, colors: settings.currentColors.minutes, lineWidth: dimensions.minutesLineWidth, startAngle: minutesStartAngle, endAngle: fullCircleEndAngle, text: minutes.toString().padStart(2, '0') },
            { key: 'seconds', radius: dimensions.secondsRadius, colors: settings.currentColors.seconds, lineWidth: dimensions.secondsLineWidth, startAngle: secondsStartAngle, endAngle: fullCircleEndAngle, text: seconds.toString().padStart(2, '0') }
        ];

        arcs.forEach(arc => {
            if (arc.radius > 0 && settings.currentColors) {
                drawArc(dimensions.centerX, dimensions.centerY, arc.radius, arc.startAngle, arc.endAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
                drawLabel({ ...arc, text: arc.text });
            }
        });

        // Draw separators if enabled
        if (settings.showSeparators) {
            drawSeparators(dimensions.hoursRadius, 12, dimensions.hoursLineWidth);
            drawSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth);
            drawSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth);
        }
    };

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

        if (settings.showArcEndCircles) {
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
        }
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

    const drawAdvancedRulerSeparators = (radius, majorDivisions, minorDivisions, arcLineWidth, arcKey) => {
        if (!radius || radius <= 0) return;

        const centerlineRadius = radius;
        const fullOuterRadius = radius + (arcLineWidth / 2);

        ctx.strokeStyle = '#121212';

        for (let i = 0; i < majorDivisions; i++) {
            for (let j = 1; j < minorDivisions; j++) {
                const angle = baseStartAngle + ((i + j / minorDivisions) / majorDivisions) * Math.PI * 2;

                let lineWidth = 1.5; // Default minor tick width
                if (arcKey === 'hours' && j === minorDivisions / 2) {
                    lineWidth = 2.0; // Thicker half-hour marker
                }

                ctx.lineWidth = lineWidth;

                const startX = dimensions.centerX + Math.cos(angle) * centerlineRadius;
                const startY = dimensions.centerY + Math.sin(angle) * centerlineRadius;
                const endX = dimensions.centerX + Math.cos(angle) * fullOuterRadius;
                const endY = dimensions.centerY + Math.sin(angle) * fullOuterRadius;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
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
        const displayMode = (settings.inverseMode && globalState.mode === 'clock') ? 'remainder' : settings.labelDisplayMode;

        switch (displayMode) {
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
        let hoursEndAngle;
        if (settings.is24HourFormat) {
            hoursEndAngle = baseStartAngle + ((hours + minutes / 60) / 24) * Math.PI * 2;
        } else {
            hoursEndAngle = baseStartAngle + ((((hours % 12) || 12) + minutes / 60) / 12) * Math.PI * 2;
        }
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

        const nowMs = now.getTime();
        arcs.filter(arc => settings.arcVisibility[arc.key]).forEach(arc => {
            if (arc.radius > 0 && settings.currentColors) {

                if (hasCompletedCycle(arc.key, now, lastNow)) {
                    if (!resetAnimations[arc.key] || !resetAnimations[arc.key].isAnimating) {
                        resetAnimations[arc.key] = { isAnimating: true, startTime: nowMs };
                    }
                }

                const anim = resetAnimations[arc.key];
                let isAnimatingThisFrame = false;

                if (anim && anim.isAnimating) {
                    const elapsed = nowMs - anim.startTime;
                    if (elapsed < animationDuration) {
                        const progress = elapsed / animationDuration;
                        if (settings.inverseMode && globalState.mode === 'clock') {
                            // In inverse mode, the arc "fills up" from the top to represent the new cycle's remainder
                            const animatedEndAngle = baseStartAngle + (progress * Math.PI * 2);
                            drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, animatedEndAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
                        } else {
                            // In normal mode, the arc "wipes" itself clean by the tail chasing the head
                            const animatedStartAngle = baseStartAngle + (progress * Math.PI * 2);
                            drawArc(dimensions.centerX, dimensions.centerY, arc.radius, animatedStartAngle, baseStartAngle + Math.PI * 2, arc.colors.light, arc.colors.dark, arc.lineWidth);
                        }
                        isAnimatingThisFrame = true;
                    } else {
                        anim.isAnimating = false;
                    }
                }

                if (!isAnimatingThisFrame) {
                    if (settings.inverseMode && globalState.mode === 'clock') {
                        drawArc(dimensions.centerX, dimensions.centerY, arc.radius, arc.endAngle, baseStartAngle + Math.PI * 2, arc.colors.light, arc.colors.dark, arc.lineWidth);
                    } else {
                        drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, arc.endAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
                    }
                }

                arc.text = getLabelText(arc.key, now);
                drawLabel(arc);
            }
        });

        // --- Draw Separators ---
        if (settings.showSeparators) {
            const isRulerMode = settings.separatorMode === 'ruler';

            if (settings.arcVisibility.seconds && settings.separatorVisibility.seconds) {
                if (isRulerMode) {
                    drawRulerSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth);
                } else {
                    drawSeparators(dimensions.secondsRadius, 60, dimensions.secondsLineWidth);
                }
            }

            if (settings.arcVisibility.minutes && settings.separatorVisibility.minutes) {
                if (isRulerMode) {
                    drawRulerSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth);
                } else {
                    drawSeparators(dimensions.minutesRadius, 60, dimensions.minutesLineWidth);
                }
            }

            // Other arcs always use standard separators
            if (settings.arcVisibility.hours && settings.separatorVisibility.hours) {
                drawSeparators(dimensions.hoursRadius, 12, dimensions.hoursLineWidth);
                if (settings.separatorMode === 'ruler') {
                    drawAdvancedRulerSeparators(dimensions.hoursRadius, 12, 4, dimensions.hoursLineWidth, 'hours');
                }
            }
            if (settings.arcVisibility.day && settings.separatorVisibility.day) drawSeparators(dimensions.dayRadius, daysInMonth, dimensions.dayLineWidth);
            if (settings.arcVisibility.month && settings.separatorVisibility.month) {
                drawSeparators(dimensions.monthRadius, 12, dimensions.monthLineWidth);
                if (settings.separatorMode === 'ruler') {
                    drawAdvancedRulerSeparators(dimensions.monthRadius, 12, 4, dimensions.monthLineWidth, 'month');
                }
            }
            if (settings.arcVisibility.dayOfWeek && settings.separatorVisibility.dayOfWeek) drawSeparators(dimensions.dayOfWeekRadius, 7, dimensions.dayOfWeekLineWidth);
            if (settings.arcVisibility.weekOfYear && settings.separatorVisibility.weekOfYear) drawSeparators(dimensions.weekOfYearRadius, getTotalWeeksInYear(now.getFullYear()), dimensions.weekOfYearLineWidth);
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
        } else if (globalState.mode === 'timer') {
            drawTimer();
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
            const thinnerLineWidth = renderedLineWidth * 0.5;
            const renderedGap = (1.875 / 57) * baseRadius;

            const arcOrder = ['weekOfYear', 'seconds', 'minutes', 'hours', 'day', 'month', 'dayOfWeek'];
            const arcLineWidths = {
                weekOfYear: thinnerLineWidth,
                seconds: renderedLineWidth,
                minutes: renderedLineWidth,
                hours: renderedLineWidth,
                day: renderedLineWidth,
                month: renderedLineWidth,
                dayOfWeek: thinnerLineWidth
            };

            const visibleArcs = arcOrder.filter(arcKey => settings.arcVisibility[arcKey]);
            const numVisible = visibleArcs.length;
            const totalArcWidth = visibleArcs.reduce((total, arcKey) => total + arcLineWidths[arcKey], 0);
            const totalGap = (numVisible > 0) ? (numVisible - 1) * renderedGap : 0;
            const totalHeight = totalArcWidth + totalGap;

            let currentRadius = (baseRadius + totalHeight) / 2;

            for (const arcKey of arcOrder) {
                if (settings.arcVisibility[arcKey]) {
                    const lineWidth = arcLineWidths[arcKey];
                    dimensions[`${arcKey}LineWidth`] = lineWidth;
                    dimensions[`${arcKey}Radius`] = currentRadius - (lineWidth / 2);
                    currentRadius -= (lineWidth + renderedGap);
                } else {
                    dimensions[`${arcKey}Radius`] = 0;
                }
            }
        },
        update: function(newSettings, newState) {
            settings = newSettings;
            globalState = newState;
            this.resume();
        }
    };

    return publicInterface;
})();
