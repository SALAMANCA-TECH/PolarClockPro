class Clock {
    constructor(canvas) {
        this.canvas = canvas;
        if (!this.canvas) {
            return;
        }
        this.ctx = this.canvas.getContext('2d');

        this.settings = {};
        this.globalState = {};
        this.dimensions = {};
        this.baseStartAngle = -Math.PI / 2;
        this.lastNow = new Date();
        this.isFirstFrameDrawn = false;
        this.animationFrameId = null;
        this.resetAnimations = {};
        this.animationDuration = 1500; // 1.5 seconds
        this.lastColorChangeMinute = -1;
    }

    hasCompletedCycle(unit, now, lastNow) {
        switch (unit) {
            case 'seconds':
                return lastNow.getSeconds() === 59 && now.getSeconds() === 0;
            case 'minutes':
                return lastNow.getMinutes() === 59 && now.getMinutes() === 0;
            case 'hours':
                if (this.settings.is24HourFormat) {
                    return lastNow.getHours() === 23 && now.getHours() === 0;
                } else {
                    const lastHour12 = lastNow.getHours() % 12;
                    const nowHour12 = now.getHours() % 12;
                    return lastHour12 === 11 && nowHour12 === 0;
                }
            case 'day':
                return now.getDate() === 1 && lastNow.getDate() > 1;
            case 'month':
                return now.getMonth() === 0 && lastNow.getMonth() === 11;
            case 'dayOfWeek':
                return this.getDayOfWeek(now) === 1 && this.getDayOfWeek(lastNow) === 7;
            case 'weekOfYear':
                return this.getWeekOfYear(now) === 1 && this.getWeekOfYear(lastNow) > 1;
            default:
                return false;
        }
    }

    drawTimer() {
        if (!this.settings.currentColors || !this.globalState.timer) {
            return;
        }

        const { remainingSeconds, totalSeconds } = this.globalState.timer;

        if (totalSeconds === 0) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const remaining = Math.max(0, remainingSeconds);
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);

        const arcsToShow = [];
        if (totalSeconds >= 86400) arcsToShow.push('day');
        if (totalSeconds >= 3600) arcsToShow.push('hours');
        if (totalSeconds >= 60) arcsToShow.push('minutes');
        arcsToShow.push('seconds');

        const drawnArcs = [];
        const largestUnit = arcsToShow[0];

        if (this.globalState.timer.style) {
            arcsToShow.forEach(unit => {
                let progress;
                let text;

                if (unit === largestUnit) {
                    progress = remaining / totalSeconds;
                } else {
                    switch (unit) {
                        case 'hours':
                            progress = (remaining % 86400) / 86400;
                            break;
                        case 'minutes':
                            progress = (remaining % 3600) / 3600;
                            break;
                        case 'seconds':
                            progress = (remaining % 60) / 60;
                            break;
                        default:
                            progress = 0;
                    }
                }

                switch (unit) {
                    case 'day':
                        text = days.toString();
                        break;
                    case 'hours':
                        text = hours.toString().padStart(2, '0');
                        break;
                    case 'minutes':
                        text = minutes.toString().padStart(2, '0');
                        break;
                    case 'seconds':
                        text = Math.floor(remaining % 60).toString().padStart(2, '0');
                        break;
                }

                const angle = progress * Math.PI * 2;
                const startAngle = this.baseStartAngle;
                const endAngle = this.baseStartAngle + angle;

                drawnArcs.push({
                    key: unit,
                    radius: this.dimensions[`${unit}Radius`],
                    colors: this.settings.currentColors[unit],
                    lineWidth: this.dimensions[`${unit}LineWidth`],
                    startAngle: startAngle,
                    endAngle: endAngle,
                    text: text
                });
            });
        } else {
            const secondsValue = Math.floor(remaining % 60);

            arcsToShow.forEach(unit => {
                let progress;
                let text;

                switch (unit) {
                    case 'day':
                        progress = days / 7;
                        text = days.toString();
                        break;
                    case 'hours':
                        progress = (days > 0 && hours === 0) ? 1 : hours / 24;
                        text = hours.toString().padStart(2, '0');
                        break;
                    case 'minutes':
                        progress = ((days > 0 || hours > 0) && minutes === 0) ? 1 : minutes / 60;
                        text = minutes.toString().padStart(2, '0');
                        break;
                    case 'seconds':
                        progress = ((days > 0 || hours > 0 || minutes > 0) && secondsValue === 0) ? 1 : secondsValue / 60;
                        text = secondsValue.toString().padStart(2, '0');
                        break;
                    default:
                        progress = 0;
                        text = '0';
                }

                const angle = progress * Math.PI * 2;
                const startAngle = this.baseStartAngle;
                const endAngle = this.baseStartAngle + angle;

                drawnArcs.push({
                    key: unit,
                    radius: this.dimensions[`${unit}Radius`],
                    colors: this.settings.currentColors[unit],
                    lineWidth: this.dimensions[`${unit}LineWidth`],
                    startAngle: startAngle,
                    endAngle: endAngle,
                    text: text
                });
            });
        }

        drawnArcs.forEach(arc => {
            if (arc.radius > 0 && arc.colors) {
                this.drawArc(this.dimensions.centerX, this.dimensions.centerY, arc.radius, arc.startAngle, arc.endAngle, arc.colors, arc.lineWidth);
                this.drawLabel({ ...arc });
            }
        });

        if (this.settings.showSeparators) {
            drawnArcs.forEach(arc => {
                if (arc.radius > 0 && this.settings.separatorVisibility[arc.key]) {
                    let count = 60;
                    if (arc.key === 'hours') count = 24;
                    if (arc.key === 'day') count = 7;
                    this.drawSeparators(arc.radius, count, arc.lineWidth);
                }
            });
        }
    }

    drawArc(x, y, radius, startAngle, endAngle, color, lineWidth) {
        if (radius <= 0) return;
        if (Math.abs(endAngle - startAngle) < 0.0001) return;

        this.ctx.save();

        let strokeStyle = color;
        if (this.settings.colorPreset === 'Candy') {
            const innerRadius = radius - lineWidth / 2;
            const outerRadius = radius + lineWidth / 2;
            const gradient = this.ctx.createLinearGradient(x - innerRadius, y - innerRadius, x + outerRadius, y + outerRadius);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
            strokeStyle = gradient;
        } else if (this.settings.colorPreset === 'Neon') {
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 10;
        }

        this.ctx.strokeStyle = strokeStyle;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, startAngle, endAngle);
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawLabel(arc) {
        const textX = this.dimensions.centerX;
        const textY = this.dimensions.centerY + arc.radius;

        let fontSizeMultiplier = 0.4;
        let circleSizeMultiplier = 0.5;

        if (this.settings.showArcEndCircles) {
            const circleRadius = arc.lineWidth * circleSizeMultiplier;
            this.ctx.beginPath();
            this.ctx.arc(textX, textY, circleRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#000000';
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(textX, textY, circleRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = `${arc.lineWidth * fontSizeMultiplier}px Bahnschrift`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(arc.text, textX, textY);
        }
    }

    drawSeparators(radius, count, arcLineWidth) {
        if (!radius || radius <= 0) return;

        const innerRadius = radius - (arcLineWidth / 2);
        const outerRadius = radius + (arcLineWidth / 2);

        this.ctx.strokeStyle = '#121212';
        this.ctx.lineWidth = 2;

        const divisions = (count === 60) ? 12 : count;
        const step = (count === 60) ? 5 : 1;

        for (let i = 0; i < divisions; i++) {
            const index = i * step;
            const angle = this.baseStartAngle + (index / count) * Math.PI * 2;

            const startX = this.dimensions.centerX + Math.cos(angle) * innerRadius;
            const startY = this.dimensions.centerY + Math.sin(angle) * innerRadius;
            const endX = this.dimensions.centerX + Math.cos(angle) * outerRadius;
            const endY = this.dimensions.centerY + Math.sin(angle) * outerRadius;

            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
    }

    drawRulerSeparators(radius, count, arcLineWidth) {
        if (!radius || radius <= 0) return;

        const centerlineRadius = radius;
        const fullInnerRadius = radius - (arcLineWidth / 2);
        const fullOuterRadius = radius + (arcLineWidth / 2);

        this.ctx.strokeStyle = '#121212';

        for (let i = 0; i < count; i++) {
            const angle = this.baseStartAngle + (i / count) * Math.PI * 2;
            const isMajorTick = i % 5 === 0;
            const innerRadius = isMajorTick ? fullInnerRadius : centerlineRadius;
            const outerRadius = fullOuterRadius;

            this.ctx.lineWidth = isMajorTick ? 2.5 : 1.5;

            const startX = this.dimensions.centerX + Math.cos(angle) * innerRadius;
            const startY = this.dimensions.centerY + Math.sin(angle) * innerRadius;
            const endX = this.dimensions.centerX + Math.cos(angle) * outerRadius;
            const endY = this.dimensions.centerY + Math.sin(angle) * outerRadius;

            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
    }

    drawAdvancedRulerSeparators(radius, majorDivisions, minorDivisions, arcLineWidth, arcKey) {
        if (!radius || radius <= 0) return;

        const centerlineRadius = radius;
        const fullOuterRadius = radius + (arcLineWidth / 2);

        this.ctx.strokeStyle = '#121212';

        for (let i = 0; i < majorDivisions; i++) {
            for (let j = 1; j < minorDivisions; j++) {
                const angle = this.baseStartAngle + ((i + j / minorDivisions) / majorDivisions) * Math.PI * 2;

                let lineWidth = 1.5;
                if (arcKey === 'hours' && j === minorDivisions / 2) {
                    lineWidth = 2.0;
                }

                this.ctx.lineWidth = lineWidth;

                const startX = this.dimensions.centerX + Math.cos(angle) * centerlineRadius;
                const startY = this.dimensions.centerY + Math.sin(angle) * centerlineRadius;
                const endX = this.dimensions.centerX + Math.cos(angle) * fullOuterRadius;
                const endY = this.dimensions.centerY + Math.sin(angle) * fullOuterRadius;

                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            }
        }
    }

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    getDayOfWeek(date) {
        const day = date.getDay();
        return day === 0 ? 7 : day;
    }

    getTotalWeeksInYear(year) {
        const date = new Date(year, 11, 28);
        return this.getWeekOfYear(date);
    }

    getWeekOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 1);
        const diff = (date - start) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
        const oneDay = 1000 * 60 * 60 * 24;
        const day = Math.floor(diff / oneDay);
        return Math.ceil((day + 1) / 7);
    }

    getLabelText(unit, now) {
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
        const daysInMonth = this.getDaysInMonth(year, month);
        const dayOfWeek = this.getDayOfWeek(now);
        const weekOfYear = this.getWeekOfYear(now);
        const totalWeeks = this.getTotalWeeksInYear(year);
        const displayMode = (this.settings.inverseMode && this.globalState.mode === 'clock') ? 'remainder' : 'standard';

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
            default:
                if (unit === 'seconds') return seconds.toString().padStart(2, '0');
                if (unit === 'minutes') return minutes.toString().padStart(2, '0');
                if (unit === 'hours') {
                    if (this.settings.is24HourFormat) {
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
    }

    drawClock() {
        if (!this.settings.currentColors || !this.globalState.timer) {
            return;
        }

        const now = this.globalState.staticTime ? new Date(this.globalState.staticTime) : new Date();
        if (this.settings.flowMode) {
            const minutes = now.getMinutes();
            if (minutes % 5 === 0 && minutes !== this.lastColorChangeMinute) {
                Settings.cycleColorPreset();
                this.lastColorChangeMinute = minutes;
            }
        }
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
        const dayOfWeek = this.getDayOfWeek(now);
        const daysInMonth = this.getDaysInMonth(year, month);
        const weekOfYear = this.getWeekOfYear(now);
        const totalWeeks = this.getTotalWeeksInYear(year);

        const dayOfWeekEndAngle = this.baseStartAngle + (dayOfWeek / 7) * Math.PI * 2;
        const monthEndAngle = this.baseStartAngle + ((month + date / daysInMonth) / 12) * Math.PI * 2;
        const dayEndAngle = this.baseStartAngle + ((date - 1 + (hours + minutes / 60) / 24) / daysInMonth) * Math.PI * 2;
        let hoursEndAngle;
        if (this.settings.is24HourFormat) {
            hoursEndAngle = this.baseStartAngle + ((hours + minutes / 60) / 24) * Math.PI * 2;
        } else {
            hoursEndAngle = this.baseStartAngle + ((((hours % 12) || 12) + minutes / 60) / 12) * Math.PI * 2;
        }
        const minutesEndAngle = this.baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
        const secondsEndAngle = this.baseStartAngle + ((seconds + now.getMilliseconds() / 1000) / 60) * Math.PI * 2;
        const weekOfYearEndAngle = this.baseStartAngle + (weekOfYear / totalWeeks) * Math.PI * 2;

        const arcs = [
            { key: 'dayOfWeek', radius: this.dimensions.dayOfWeekRadius, colors: this.settings.currentColors.dayOfWeek, lineWidth: this.dimensions.dayOfWeekLineWidth, endAngle: dayOfWeekEndAngle },
            { key: 'month', radius: this.dimensions.monthRadius, colors: this.settings.currentColors.month, lineWidth: this.dimensions.monthLineWidth, endAngle: monthEndAngle },
            { key: 'day', radius: this.dimensions.dayRadius, colors: this.settings.currentColors.day, lineWidth: this.dimensions.dayLineWidth, endAngle: dayEndAngle },
            { key: 'hours', radius: this.dimensions.hoursRadius, colors: this.settings.currentColors.hours, lineWidth: this.dimensions.hoursLineWidth, endAngle: hoursEndAngle },
            { key: 'minutes', radius: this.dimensions.minutesRadius, colors: this.settings.currentColors.minutes, lineWidth: this.dimensions.minutesLineWidth, endAngle: minutesEndAngle },
            { key: 'seconds', radius: this.dimensions.secondsRadius, colors: this.settings.currentColors.seconds, lineWidth: this.dimensions.secondsLineWidth, endAngle: secondsEndAngle },
            { key: 'weekOfYear', radius: this.dimensions.weekOfYearRadius, colors: this.settings.currentColors.weekOfYear, lineWidth: this.dimensions.weekOfYearLineWidth, endAngle: weekOfYearEndAngle }
        ];

        const nowMs = now.getTime();
        const visibleArcs = arcs.filter(arc => this.settings.arcVisibility[arc.key]);

        visibleArcs.forEach(arc => {
            if (arc.radius > 0 && this.settings.currentColors) {
                if (this.hasCompletedCycle(arc.key, now, this.lastNow)) {
                    if (!this.resetAnimations[arc.key] || !this.resetAnimations[arc.key].isAnimating) {
                        this.resetAnimations[arc.key] = { isAnimating: true, startTime: nowMs };
                    }
                }

                if (this.settings.inverseMode && this.globalState.mode === 'clock') {
                    this.drawArc(this.dimensions.centerX, this.dimensions.centerY, arc.radius, arc.endAngle, this.baseStartAngle + Math.PI * 2, arc.colors, arc.lineWidth);
                } else {
                    this.drawArc(this.dimensions.centerX, this.dimensions.centerY, arc.radius, this.baseStartAngle, arc.endAngle, arc.colors, arc.lineWidth);
                }

                const anim = this.resetAnimations[arc.key];
                if (anim && anim.isAnimating) {
                    if (this.settings.inverseMode && this.globalState.mode === 'clock') {
                        anim.isAnimating = false;
                    } else {
                        const elapsed = nowMs - anim.startTime;
                        if (elapsed < this.animationDuration) {
                            const progress = elapsed / this.animationDuration;
                            const animatedStartAngle = this.baseStartAngle + (progress * Math.PI * 2);
                            this.drawArc(this.dimensions.centerX, this.dimensions.centerY, arc.radius, animatedStartAngle, this.baseStartAngle + Math.PI * 2, arc.colors, arc.lineWidth);
                        } else {
                            anim.isAnimating = false;
                        }
                    }
                }
                arc.text = this.getLabelText(arc.key, now);
            }
        });

        if (this.settings.showSeparators) {
            const isRulerMode = this.settings.separatorMode === 'ruler';

            if (this.settings.arcVisibility.seconds && this.settings.separatorVisibility.seconds) {
                if (isRulerMode) {
                    this.drawRulerSeparators(this.dimensions.secondsRadius, 60, this.dimensions.secondsLineWidth);
                } else {
                    this.drawSeparators(this.dimensions.secondsRadius, 60, this.dimensions.secondsLineWidth);
                }
            }

            if (this.settings.arcVisibility.minutes && this.settings.separatorVisibility.minutes) {
                if (isRulerMode) {
                    this.drawRulerSeparators(this.dimensions.minutesRadius, 60, this.dimensions.minutesLineWidth);
                } else {
                    this.drawSeparators(this.dimensions.minutesRadius, 60, this.dimensions.minutesLineWidth);
                }
            }

            if (this.settings.arcVisibility.hours && this.settings.separatorVisibility.hours) {
                this.drawSeparators(this.dimensions.hoursRadius, 12, this.dimensions.hoursLineWidth);
                if (this.settings.separatorMode === 'ruler') {
                    this.drawAdvancedRulerSeparators(this.dimensions.hoursRadius, 12, 4, this.dimensions.hoursLineWidth, 'hours');
                }
            }
            if (this.settings.arcVisibility.day && this.settings.separatorVisibility.day) this.drawSeparators(this.dimensions.dayRadius, daysInMonth, this.dimensions.dayLineWidth);
            if (this.settings.arcVisibility.month && this.settings.separatorVisibility.month) {
                this.drawSeparators(this.dimensions.monthRadius, 12, this.dimensions.monthLineWidth);
                if (this.settings.separatorMode === 'ruler') {
                    this.drawAdvancedRulerSeparators(this.dimensions.monthRadius, 12, 4, this.dimensions.monthLineWidth, 'month');
                }
            }
            if (this.settings.arcVisibility.dayOfWeek && this.settings.separatorVisibility.dayOfWeek) this.drawSeparators(this.dimensions.dayOfWeekRadius, 7, this.dimensions.dayOfWeekLineWidth);
            if (this.settings.arcVisibility.weekOfYear && this.settings.separatorVisibility.weekOfYear) this.drawSeparators(this.dimensions.weekOfYearRadius, this.getTotalWeeksInYear(now.getFullYear()), this.dimensions.weekOfYearLineWidth);
        }

        visibleArcs.forEach(arc => {
            if (arc.radius > 0 && this.settings.currentColors) {
                this.drawLabel(arc);
            }
        });

        this.lastNow = now;

        if (!this.isFirstFrameDrawn && this.dimensions.secondsRadius > 0) {
            this.isFirstFrameDrawn = true;
            this.canvas.dispatchEvent(new CustomEvent('clockready', { bubbles: true }));
        }
    }

    drawStopwatch() {
        if (!this.settings.currentColors || !this.globalState.stopwatch) {
            return;
        }

        const time = new Date(this.globalState.stopwatch.elapsedTime);
        const milliseconds = time.getUTCMilliseconds();
        const seconds = time.getUTCSeconds();
        const minutes = time.getUTCMinutes();
        const hours = time.getUTCHours();

        const secondsEndAngle = this.baseStartAngle + ((seconds + milliseconds / 1000) / 60) * Math.PI * 2;
        const minutesEndAngle = this.baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
        const hoursEndAngle = this.baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;

        const arcs = [
            { key: 'hours', radius: this.dimensions.hoursRadius, colors: this.settings.currentColors.hours, lineWidth: 45, endAngle: hoursEndAngle, text: hours.toString().padStart(2, '0') },
            { key: 'minutes', radius: this.dimensions.minutesRadius, colors: this.settings.currentColors.minutes, lineWidth: 30, endAngle: minutesEndAngle, text: minutes.toString().padStart(2, '0') },
            { key: 'seconds', radius: this.dimensions.secondsRadius, colors: this.settings.currentColors.seconds, lineWidth: 30, endAngle: secondsEndAngle, text: seconds.toString().padStart(2, '0') }
        ];

        arcs.forEach(arc => {
            if (arc.radius > 0 && this.settings.currentColors) {
                this.drawArc(this.dimensions.centerX, this.dimensions.centerY, arc.radius, this.baseStartAngle, arc.endAngle, arc.colors, arc.lineWidth);
                this.drawLabel(arc);
            }
        });
    }

    drawPomodoro() {
        if (!this.settings.currentColors || !this.globalState.pomodoro) {
            return;
        }

        const { phase, remainingSeconds } = this.globalState.pomodoro;
        const { workDuration, shortBreakDuration, longBreakDuration } = this.globalState.pomodoro;

        let totalDuration;
        if (phase === 'work') {
            totalDuration = workDuration * 60;
        } else if (phase === 'shortBreak') {
            totalDuration = shortBreakDuration * 60;
        } else {
            totalDuration = longBreakDuration * 60;
        }

        const remaining = Math.max(0, remainingSeconds);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);
        const milliseconds = (remaining - Math.floor(remaining));

        const arcs = [];
        if (totalDuration >= 3600) {
            const hoursProgress = (hours + (minutes / 60) + (seconds / 3600)) / 12;
            const hoursEndAngle = this.baseStartAngle + hoursProgress * Math.PI * 2;
            arcs.push({
                key: 'hours',
                radius: this.dimensions.hoursRadius,
                colors: this.settings.currentColors.hours,
                lineWidth: this.dimensions.hoursLineWidth,
                startAngle: this.baseStartAngle,
                endAngle: hoursEndAngle,
                text: hours.toString().padStart(2, '0')
            });
        }

        const minutesProgress = (minutes + (seconds / 60) + (milliseconds / 60)) / 60;
        const minutesEndAngle = this.baseStartAngle + minutesProgress * Math.PI * 2;
        arcs.push({
            key: 'minutes',
            radius: this.dimensions.minutesRadius,
            colors: this.settings.currentColors.minutes,
            lineWidth: this.dimensions.minutesLineWidth,
            startAngle: this.baseStartAngle,
            endAngle: minutesEndAngle,
            text: minutes.toString().padStart(2, '0')
        });

        const secondsProgress = (seconds + milliseconds) / 60;
        const secondsEndAngle = this.baseStartAngle + secondsProgress * Math.PI * 2;
        arcs.push({
            key: 'seconds',
            radius: this.dimensions.secondsRadius,
            colors: this.settings.currentColors.seconds,
            lineWidth: this.dimensions.secondsLineWidth,
            startAngle: this.baseStartAngle,
            endAngle: secondsEndAngle,
            text: seconds.toString().padStart(2, '0')
        });

        arcs.forEach(arc => {
            if (arc.radius > 0 && this.settings.currentColors) {
                this.drawArc(this.dimensions.centerX, this.dimensions.centerY, arc.radius, arc.startAngle, arc.endAngle, arc.colors, arc.lineWidth);
                this.drawLabel({ ...arc, text: arc.text });
            }
        });

        if (this.settings.showSeparators) {
            const isRulerMode = this.settings.separatorMode === 'ruler';
            if (totalDuration >= 3600) {
                this.drawSeparators(this.dimensions.hoursRadius, 12, this.dimensions.hoursLineWidth);
            }
            if (isRulerMode) {
                this.drawRulerSeparators(this.dimensions.minutesRadius, 60, this.dimensions.minutesLineWidth);
                this.drawRulerSeparators(this.dimensions.secondsRadius, 60, this.dimensions.secondsLineWidth);
            } else {
                this.drawSeparators(this.dimensions.minutesRadius, 60, this.dimensions.minutesLineWidth);
                this.drawSeparators(this.dimensions.secondsRadius, 60, this.dimensions.secondsLineWidth);
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.globalState.staticTime) {
            this.drawClock();
        } else {
            if (this.globalState.mode === 'pomodoro') {
                this.drawPomodoro();
            } else if (this.globalState.mode === 'stopwatch') {
                this.drawStopwatch();
            } else if (this.globalState.mode === 'timer') {
                this.drawTimer();
            } else {
                this.drawClock();
            }
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        }
    }

    init(initialSettings, initialState) {
        this.settings = initialSettings;
        this.globalState = initialState;
        window.addEventListener('resize', () => this.resize());
        this.resume();
    }

    pause() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    resume() {
        if (this.globalState.staticTime) {
            this.animate();
        } else if (!this.animationFrameId) {
            this.lastNow = new Date();
            this.animate();
        }
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.dimensions.centerX = this.canvas.width / 2;
        this.dimensions.centerY = this.canvas.height / 2;

        const baseRadius = Math.min(this.dimensions.centerX, this.dimensions.centerY) * 0.9;
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

        const isArcVisible = (arcKey) => {
            if (this.globalState.mode === 'timer' && this.globalState.timer) {
                const { totalSeconds } = this.globalState.timer;
                if (totalSeconds === 0) return false;
                switch (arcKey) {
                    case 'day':
                        return totalSeconds >= 86400;
                    case 'hours':
                        return totalSeconds >= 3600;
                    case 'minutes':
                        return totalSeconds >= 60;
                    case 'seconds':
                        return totalSeconds > 0;
                    default:
                        return false;
                }
            } else {
                return this.settings.arcVisibility[arcKey];
            }
        };

        const visibleArcs = arcOrder.filter(isArcVisible);
        const numVisible = visibleArcs.length;
        const totalArcWidth = visibleArcs.reduce((total, arcKey) => total + (arcLineWidths[arcKey] || 0), 0);
        const totalGap = (numVisible > 0) ? (numVisible - 1) * renderedGap : 0;
        const totalHeight = totalArcWidth + totalGap;

        let currentRadius = (baseRadius + totalHeight) / 2;

        for (const arcKey of arcOrder) {
            if (isArcVisible(arcKey)) {
                const lineWidth = arcLineWidths[arcKey];
                this.dimensions[`${arcKey}LineWidth`] = lineWidth;
                this.dimensions[`${arcKey}Radius`] = currentRadius - (lineWidth / 2);
                currentRadius -= (lineWidth + renderedGap);
            } else {
                this.dimensions[`${arcKey}Radius`] = 0;
            }
        }
    }

    update(newSettings, newState) {
        this.settings = newSettings;
        this.globalState = newState;
        this.resume();
    }
}
