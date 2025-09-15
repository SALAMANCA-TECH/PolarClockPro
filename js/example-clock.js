const ExampleClock = (function() {
    const canvas = document.getElementById('exampleClockCanvas');
    if (!canvas) {
        console.error("ExampleClock: Could not find canvas element with id 'exampleClockCanvas'");
        return;
    }
    const ctx = canvas.getContext('2d');

    let settings = {};
    let dimensions = {};
    const baseStartAngle = -Math.PI / 2;

    // Fixed time: Saturday, October 24th, 2020 at 8:23 PM
    const now = new Date(2020, 9, 24, 20, 23, 0);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getDayOfWeek = (date) => {
        const day = date.getDay();
        return day === 0 ? 7 : day; // Monday is 1, Sunday is 7
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

    function drawArc(x, y, radius, startAngle, endAngle, color, lineWidth) {
        if (radius <= 0 || !color) return;
        if (Math.abs(endAngle - startAngle) < 0.0001) return;

        ctx.save();
        ctx.strokeStyle = color;
        if (settings.colorPreset === 'Neon') {
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.restore();
    }

    function drawLabel(arc) {
        const textX = dimensions.centerX;
        const textY = dimensions.centerY + arc.radius;
        if (settings.showArcEndCircles) {
            const circleRadius = arc.lineWidth * 0.5;
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
            ctx.font = `${arc.lineWidth * 0.4}px Bahnschrift`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(arc.text, textX, textY);
        }
    }

    function drawSeparators(radius, count, arcLineWidth) {
        if (!radius || radius <= 0) return;
        const innerRadius = radius - (arcLineWidth / 2);
        const outerRadius = radius + (arcLineWidth / 2);
        ctx.strokeStyle = '#1a1a1a'; // Use the settings panel background color
        ctx.lineWidth = 2;
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
    }

    function drawRulerSeparators(radius, count, arcLineWidth) {
        if (!radius || radius <= 0) return;
        const centerlineRadius = radius;
        const fullInnerRadius = radius - (arcLineWidth / 2);
        const fullOuterRadius = radius + (arcLineWidth / 2);
        ctx.strokeStyle = '#1a1a1a'; // Use the settings panel background color
        for (let i = 0; i < count; i++) {
            const angle = baseStartAngle + (i / count) * Math.PI * 2;
            const isMajorTick = i % 5 === 0;
            const innerRadius = isMajorTick ? fullInnerRadius : centerlineRadius;
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
    }

    function getLabelText(unit) {
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
        const daysInMonth = getDaysInMonth(year, month);
        const dayOfWeek = getDayOfWeek(now);
        const weekOfYear = getWeekOfYear(now);
        const totalWeeks = getTotalWeeksInYear(year);
        const displayMode = settings.inverseMode ? 'remainder' : 'standard';

        switch (displayMode) {
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
                    if (settings.is24HourFormat) return hours.toString().padStart(2, '0');
                    return (hours % 12 || 12).toString();
                }
                if (unit === 'day') return date.toString();
                if (unit === 'month') return (month + 1).toString().padStart(2, '0');
                if (unit === 'dayOfWeek') return dayOfWeek.toString();
                if (unit === 'weekOfYear') return weekOfYear.toString();
                return '';
        }
    }

    function draw() {
        if (!settings.currentColors) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

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
        const secondsEndAngle = baseStartAngle + (seconds / 60) * Math.PI * 2; // No milliseconds for static clock
        const weekOfYearEndAngle = baseStartAngle + (weekOfYear / totalWeeks) * Math.PI * 2;

        const arcs = [
            { key: 'dayOfWeek', endAngle: dayOfWeekEndAngle },
            { key: 'month', endAngle: monthEndAngle },
            { key: 'day', endAngle: dayEndAngle },
            { key: 'hours', endAngle: hoursEndAngle },
            { key: 'minutes', endAngle: minutesEndAngle },
            { key: 'seconds', endAngle: secondsEndAngle },
            { key: 'weekOfYear', endAngle: weekOfYearEndAngle }
        ];

        const visibleArcs = arcs.filter(arc => settings.arcVisibility[arc.key]);

        visibleArcs.forEach(arc => {
            arc.radius = dimensions[arc.key + 'Radius'];
            arc.lineWidth = dimensions[arc.key + 'LineWidth'];
            arc.colors = settings.currentColors[arc.key];
            if (arc.radius > 0) {
                if (settings.inverseMode) {
                    drawArc(dimensions.centerX, dimensions.centerY, arc.radius, arc.endAngle, baseStartAngle + Math.PI * 2, arc.colors, arc.lineWidth);
                } else {
                    drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, arc.endAngle, arc.colors, arc.lineWidth);
                }
                arc.text = getLabelText(arc.key);
            }
        });

        if (settings.showSeparators) {
            const isRulerMode = settings.separatorMode === 'ruler';
            visibleArcs.forEach(arc => {
                if (settings.separatorVisibility[arc.key]) {
                    let count = 12; // Default for hours/month
                    if (arc.key === 'seconds' || arc.key === 'minutes') count = 60;
                    else if (arc.key === 'day') count = daysInMonth;
                    else if (arc.key === 'dayOfWeek') count = 7;
                    else if (arc.key === 'weekOfYear') count = totalWeeks;

                    if (isRulerMode && (arc.key === 'seconds' || arc.key === 'minutes')) {
                        drawRulerSeparators(arc.radius, count, arc.lineWidth);
                    } else {
                        drawSeparators(arc.radius, count, arc.lineWidth);
                    }
                }
            });
        }

        visibleArcs.forEach(arc => {
            if (arc.radius > 0) {
                drawLabel(arc);
            }
        });

        // Update digital display
        const digitalTime = document.getElementById('exampleDigitalTime');
        const digitalDate = document.getElementById('exampleDigitalDate');
        if (digitalTime && digitalDate) {
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: !settings.is24HourFormat };
            digitalTime.textContent = now.toLocaleTimeString([], timeOptions);
            digitalDate.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        }
    }

    function resize() {
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const container = document.getElementById('settings-clock-container');
        if(!container) return;

        const cssWidth = container.offsetWidth;
        const cssHeight = container.offsetHeight;
        const size = Math.min(cssWidth, cssHeight);

        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        dimensions.centerX = size / 2;
        dimensions.centerY = size / 2;

        const baseRadius = size / 2 * 0.9;
        const renderedLineWidth = (6 / 57) * baseRadius;
        const thinnerLineWidth = renderedLineWidth * 0.5;
        const renderedGap = (1.875 / 57) * baseRadius;

        const arcOrder = ['weekOfYear', 'seconds', 'minutes', 'hours', 'day', 'month', 'dayOfWeek'];
        const arcLineWidths = {
            day: renderedLineWidth,
            hours: renderedLineWidth,
            minutes: renderedLineWidth,
            seconds: renderedLineWidth,
            dayOfWeek: thinnerLineWidth,
            month: renderedLineWidth,
            weekOfYear: thinnerLineWidth
        };

        const visibleArcs = arcOrder.filter(arcKey => settings.arcVisibility[arcKey]);
        const numVisible = visibleArcs.length;
        const totalArcWidth = visibleArcs.reduce((total, arcKey) => total + (arcLineWidths[arcKey] || 0), 0);
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
        draw();
    }

    return {
        init: function(initialSettings) {
            settings = initialSettings;
            window.addEventListener('resize', resize);
        },
        update: function(newSettings) {
            settings = newSettings;
            resize(); // Recalculate dimensions and redraw
        },
        draw: draw,
        resize: resize
    };
})();
