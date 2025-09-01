import React, { useState, useEffect, useRef } from 'react';

// --- CONSTANTS ---
// NOTE: ALARM_SOUNDS is intentionally missing to reproduce the error.
const THEMES = {
    planetary: {
        second: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/154000/154414/mexicobarbaracosme_vir2_20250609_th.jpg',
        minute: 'https://cdn.textures4photoshop.com/tex/thumbs/mars-texture-thumb12.jpg',
        hour: 'https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA19643.width-1600.jpg',
        day: 'https://images-assets.nasa.gov/image/PIA00050/PIA00050~orig.jpg?w=884&h=698&fit=clip&crop=faces%2Cfocalpoint',
        month: 'https://cdn.pixabay.com/photo/2012/10/10/11/04/footprint-60614_1280.jpg',
        week: 'https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA17834.jpg',
        alarm: 'https://scied.ucar.edu/sites/default/files/styles/extra_large/public/images/Sunspot%20and%20granulation.jpg.webp?itok=3g3WWcMf',
    }
};


// --- UTILS ---
const SETTINGS_KEY = 'polarClockSettings_v2';
const ALARMS_KEY = 'polarClockAlarms_v2';

const saveSettings = (settings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Could not save settings to localStorage", error);
    }
};

const loadSettings = () => {
    try {
        const settings = localStorage.getItem(SETTINGS_KEY);
        return settings ? JSON.parse(settings) : null;
    } catch (error) {
        console.error("Could not load settings from localStorage", error);
        return null;
    }
};

const saveAlarms = (alarms) => {
    try {
        localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
    } catch (error) {
        console.error("Could not save alarms to localStorage", error);
    }
};

const loadAlarms = () => {
    try {
        const alarms = localStorage.getItem(ALARMS_KEY);
        return alarms ? JSON.parse(alarms) : null;
    } catch (error) {
        console.error("Could not load alarms from localStorage", error);
        return null;
    }
};


// --- COMPONENTS ---

const TimeArc = ({ radius, strokeWidth, percentage, color, themeUrl }) => {
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage * circumference);
    const strokeValue = themeUrl ? `url(#${themeUrl})` : color;

    return (
        <circle
            cx="150"
            cy="150"
            r={radius}
            fill="none"
            stroke={strokeValue}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 150 150)"
            strokeLinecap="butt"
        />
    );
};

const PolarClock = ({ time, settings, trackedAlarm }) => {
    const arcConfig = {
        baseRadius: 28,
        stroke: 8,
        gap: 4,
        largeGap: 8,
        weekStroke: 4,
    };

    let currentRadius = arcConfig.baseRadius;
    const arcs = [];

    const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysInYear = isLeapYear(time.getFullYear()) ? 366 : 365;
    const dayOfYear = (Date.UTC(time.getFullYear(), time.getMonth(), time.getDate()) - Date.UTC(time.getFullYear(), 0, 0)) / 864e5;
    const daysInMonth = new Date(time.getFullYear(), time.getMonth() + 1, 0).getDate();
    const weekOfYear = Math.ceil(dayOfYear / 7);

    const timeData = {
        alarm: { value: trackedAlarm ? 1 : 0, max: 1, color: settings.colors.alarm },
        month: { value: time.getMonth() + 1, max: 12, color: settings.colors.month },
        day: { value: time.getDate(), max: daysInMonth, color: settings.colors.day },
        hour: { value: time.getHours(), max: 24, color: settings.colors.hour },
        minute: { value: time.getMinutes(), max: 60, color: settings.colors.minute },
        second: { value: time.getSeconds(), max: 60, color: settings.colors.second },
        week: { value: weekOfYear, max: 52, color: settings.colors.week },
    };
    
    const arcOrder = ['alarm', 'month', 'day', 'hour', 'minute', 'second', 'week'];

     arcOrder.forEach((key) => {
        if (key === 'week' && !settings.showWeek) return;
        if (key === 'alarm' && !trackedAlarm) return;

        const isWeek = key === 'week';
        const strokeWidth = isWeek ? arcConfig.weekStroke : arcConfig.stroke;
        const radius = currentRadius + strokeWidth / 2;
        
        arcs.push({
            key,
            radius,
            strokeWidth,
            percentage: timeData[key].value / timeData[key].max,
            color: timeData[key].color,
        });

        currentRadius += strokeWidth + (key === 'day' ? arcConfig.largeGap : arcConfig.gap);
    });

    return (
        <svg viewBox="0 0 300 300" className="w-full h-full">
             <defs>
                {settings.theme !== 'solid' && Object.keys(THEMES[settings.theme] || {}).map(key => (
                    <pattern key={key} id={`${key}-pattern`} patternUnits="userSpaceOnUse" width="50" height="50">
                        <image href={THEMES[settings.theme][key]} x="0" y="0" width="50" height="50" />
                    </pattern>
                ))}
            </defs>
            <g>
                {arcs.map(arc => (
                     <TimeArc
                        key={arc.key}
                        radius={arc.radius}
                        strokeWidth={arc.strokeWidth}
                        percentage={arc.percentage}
                        color={arc.color}
                        themeUrl={settings.theme !== 'solid' ? `${arc.key}-pattern` : null}
                    />
                ))}
            </g>
        </svg>
    );
};


const DigitalDisplay = ({ time, is24Hour }) => {
    const formatTime = (date) => {
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: !is24Hour,
        };
        return new Intl.DateTimeFormat('en-US', options).format(date);
    };

    return (
        <div className="text-5xl font-mono text-white/80 tabular-nums">
            {formatTime(time)}
        </div>
    );
};

const SettingsPanel = ({ settings, setSettings }) => {
    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg text-white">
            <h2 className="text-xl font-bold mb-4 text-center">Settings</h2>
            <div className="space-y-4">
                 {/* Theme Selector - BUGGY VERSION */}
                <div className="flex items-center justify-between">
                     <label htmlFor="theme" className="font-semibold">Theme</label>
                     <select id="theme" value={settings.theme} onChange={(e) => handleSettingChange('theme', e.target.value)} className="bg-gray-600 border border-gray-500 rounded-md px-2 py-1">
                        {/* "Solid Colors" option is missing */}
                        {Object.keys(THEMES).map(themeKey => (
                            <option key={themeKey} value={themeKey}>{themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

// NOTE: This component is the source of the fatal error.
const AlarmManager = ({ alarms, setAlarms }) => {
    // This component attempts to use ALARM_SOUNDS, which is not defined in this file.
    // This will cause a ReferenceError, which is the bug described in the prompt.
    const hasSounds = ALARM_SOUNDS && ALARM_SOUNDS.length > 0;

    return (
        <div className="relative">
             <h2 className="text-xl font-bold mb-4 text-center">Alarms</h2>
             <p className="text-sm text-white/50 text-center">
                {hasSounds ? "Alarm sounds available." : "Alarm sounds not configured."}
             </p>
        </div>
    );
};


// --- APP ---

const initialSettings = {
    is24Hour: true,
    showWeek: false,
    theme: 'solid',
    colors: {
        second: '#FF5733',
        minute: '#33FF57',
        hour: '#3357FF',
        day: '#FF33A1',
        month: '#A133FF',
        week: '#33FFF6',
        alarm: '#FF0000',
    },
    // NOTE: The 'dividers' object is intentionally missing to reproduce the NaN bug
    // when loading from older localStorage formats.
};

export default function App() {
    const [time, setTime] = useState(new Date());
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    
    // NOTE: This is the non-robust state initialization to reproduce the NaN bug.
    const [settings, setSettings] = useState(() => loadSettings() || initialSettings);
    
    const [alarms, setAlarms] = useState(() => loadAlarms() || []);
    const [trackedAlarm, setTrackedAlarm] = useState({ time: '00:01:00', days: [] });

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    useEffect(() => {
        saveSettings(settings);
    }, [settings]);

    useEffect(() => {
        saveAlarms(alarms);
    }, [alarms]);

    const date = time.toLocaleDateString(undefined, {
        year: 'numeric', month: '2-digit', day: '2-digit',
    });

    return (
        // NOTE: This layout is intentionally incorrect to reproduce the layout bugs.
        <main className="relative h-screen w-screen flex items-center justify-center overflow-hidden font-sans text-white">
            <div className="absolute inset-0 flex items-center justify-center p-8">
                 <div className="relative w-full h-full max-w-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] aspect-square">
                    <PolarClock time={time} settings={settings} trackedAlarm={trackedAlarm} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <DigitalDisplay time={time} is24Hour={settings.is24Hour} />
                        <div className="text-lg text-white/50">{date}</div>
                    </div>
                </div>
            </div>
            
            <button
                onClick={() => setIsSettingsOpen(prev => !prev)}
                className="absolute top-6 right-6 z-20 w-12 h-12 bg-gray-700/50 rounded-full flex items-center justify-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37 2.37.996.608 2.296.096 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
            
            {isSettingsOpen && (
                 <div className="absolute top-0 right-0 h-full w-full max-w-sm bg-gray-800/80 backdrop-blur-sm p-8 flex flex-col space-y-6 z-10">
                    <SettingsPanel settings={settings} setSettings={setSettings} />
                    <AlarmManager alarms={alarms} setAlarms={setAlarms} />
                </div>
            )}

            <div className="absolute bottom-2 right-4 text-white/30 text-sm z-30">
                v.0.0.2
            </div>
        </main>
    );
}

