import React, { useState, useEffect, useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Play, Square, Clock, Activity } from 'lucide-react';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

ChartJS.register(Title, Tooltip, Legend, ArcElement);

const GOAL_HOURS = 400;
const START_DATE = new Date('2026-06-01T00:00:00'); // Internship Start Date

// Helper to get YYYY-MM-DD reliably based on local time
const getLocalFormattedDate = (dateObj = new Date()) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Generates an array of 7 date strings for a given week index (0 = Week 1)
const getWeekDates = (weekIndex) => {
  const weekStart = new Date(START_DATE);
  weekStart.setDate(weekStart.getDate() + (weekIndex * 7));
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    dates.push({
      dateStr: getLocalFormattedDate(d),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' })
    });
  }
  return dates;
};

// Helper component for 5 AM - 11 PM Weekly Timeline
const WeeklyTimeline = ({ weekDates, dailyLogs, isActive, sessionStartTime }) => {
  const START_HOUR = 5;
  const END_HOUR = 23; // 11 PM
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

  const getPositionAndHeight = (startMs, endMs) => {
    const startDate = new Date(startMs);
    const endDate = new Date(endMs);

    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

    const clampedStart = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, startMinutes));
    const clampedEnd = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, endMinutes));

    const topPercentage = ((clampedStart - (START_HOUR * 60)) / TOTAL_MINUTES) * 100;
    const heightPercentage = ((clampedEnd - clampedStart) / TOTAL_MINUTES) * 100;

    return { top: `${topPercentage}%`, height: `${heightPercentage}%` };
  };

  const todayStr = getLocalFormattedDate();

  return (
    <div className="relative h-[350px] w-full bg-[#1e1f20] rounded-xl flex border border-gray-800">
      {/* Y-Axis Time Labels */}
      <div className="flex flex-col justify-between text-googleSecondary text-xs py-3 px-4 border-r border-gray-800 shrink-0 mt-8">
        <span>5 AM</span>
        <span>8 AM</span>
        <span>11 AM</span>
        <span>2 PM</span>
        <span>5 PM</span>
        <span>8 PM</span>
        <span>11 PM</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {weekDates.map((dayInfo) => {
          const logData = dailyLogs[dayInfo.dateStr] || { sessions: [], hoursWorked: 0, smokeBreaks: 0 };
          const sessions = logData.sessions || [];
          const isToday = dayInfo.dateStr === todayStr;

          return (
            <div key={dayInfo.dateStr} className="flex-1 flex flex-col border-r border-gray-800 last:border-0">
              <div className={`text-center py-2 text-xs font-medium border-b border-gray-800 ${isToday ? 'text-googleBlue bg-googleBlue/10' : 'text-googleSecondary'}`}>
                {dayInfo.dayName}
              </div>
              <div className="relative flex-1 mx-1 my-3 bg-[#28292a] rounded-md">
                {/* Render historical sessions */}
                {sessions.map((session, i) => {
                  const { top, height } = getPositionAndHeight(session.start, session.end);
                  if (height === '0%') return null;
                  return (
                    <div
                      key={i}
                      className="absolute left-0 w-full bg-googleBlue/70 border-l-2 border-googleBlue rounded-sm"
                      style={{ top, height }}
                    />
                  );
                })}
                {/* Render live active session pulse */}
                {isToday && isActive && sessionStartTime && (
                  (() => {
                    const { top, height } = getPositionAndHeight(sessionStartTime, Date.now());
                    if (height === '0%') return null;
                    return (
                      <div
                        className="absolute left-0 w-full bg-green-500/50 border-l-2 border-green-400 animate-pulse rounded-sm z-10"
                        style={{ top, height }}
                      />
                    );
                  })()
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [smokeBreaks, setSmokeBreaks] = useState(0);
  
  const [dailyLogs, setDailyLogs] = useState({});
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    // Determine current week based on start date
    const now = Date.now();
    let diffDays = Math.floor((now - START_DATE.getTime()) / (1000 * 60 * 60 * 24));
    let weekIndex = Math.floor(diffDays / 7);
    if (weekIndex < 0) weekIndex = 0;
    if (weekIndex > 7) weekIndex = 7; // Cap at 8 weeks
    setCurrentWeekIndex(weekIndex);
    setActiveWeekIndex(weekIndex);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, 'stats', 'internship');
      try {
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setDailyLogs(data.dailyLogs || {});
          setTotalSeconds(data.totalSeconds || 0);
          setSmokeBreaks(data.smokeBreaks || 0);
          setIsActive(data.isActive || false);
          setSessionStartTime(data.sessionStartTime || null);
        } else {
          // Fallback if document doesn't exist
          setDailyLogs({});
        }
      } catch (error) {
        console.error("Firebase fetch error:", error);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Sync Timer Seamlessly
  useEffect(() => {
    if (isActive && sessionStartTime) {
      setSessionSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      timerRef.current = setInterval(() => {
        setSessionSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    } else {
      setSessionSeconds(0);
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, sessionStartTime]);

  const updateFirebase = async (updates) => {
    try {
      const docRef = doc(db, 'stats', 'internship');
      await setDoc(docRef, updates, { merge: true });
    } catch (err) {
      console.error("Firebase update error:", err);
    }
  };

  const toggleTimer = () => {
    const todayStr = getLocalFormattedDate();
    const now = Date.now();

    if (isActive) {
      // STOP TIMER
      const elapsed = sessionStartTime ? Math.floor((now - sessionStartTime) / 1000) : 0;
      
      const updatedLogs = { ...dailyLogs };
      
      // If today doesn't exist in DB yet, initialize it cleanly
      if (!updatedLogs[todayStr]) {
        updatedLogs[todayStr] = {
          date: todayStr,
          dayName: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          hoursWorked: 0,
          smokeBreaks: 0,
          sessions: []
        };
      }

      updatedLogs[todayStr] = {
        ...updatedLogs[todayStr],
        hoursWorked: updatedLogs[todayStr].hoursWorked + (elapsed / 3600),
        sessions: [...updatedLogs[todayStr].sessions, { start: sessionStartTime, end: now }]
      };

      setDailyLogs(updatedLogs);
      setTotalSeconds(prev => prev + elapsed);
      setIsActive(false);
      setSessionStartTime(null);

      updateFirebase({
        dailyLogs: updatedLogs,
        totalSeconds: totalSeconds + elapsed,
        isActive: false,
        sessionStartTime: null
      });

    } else {
      // START TIMER
      setIsActive(true);
      setSessionStartTime(now);
      updateFirebase({ isActive: true, sessionStartTime: now });
    }
  };

  const addSmokeBreak = () => {
    const todayStr = getLocalFormattedDate();
    const updatedBreaks = smokeBreaks + 1;
    setSmokeBreaks(updatedBreaks);

    const updatedLogs = { ...dailyLogs };
    if (!updatedLogs[todayStr]) {
      updatedLogs[todayStr] = {
        date: todayStr,
        dayName: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        hoursWorked: 0,
        smokeBreaks: 0,
        sessions: []
      };
    }
    
    updatedLogs[todayStr].smokeBreaks += 1;
    setDailyLogs(updatedLogs);

    updateFirebase({ smokeBreaks: updatedBreaks, dailyLogs: updatedLogs });
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-googleBg text-googleText flex items-center justify-center font-bold text-xl">
        Connecting to Cloud Uplink...
      </div>
    );
  }

  const displayTotalSeconds = totalSeconds + (isActive ? sessionSeconds : 0);
  const totalHoursDone = (displayTotalSeconds / 3600).toFixed(2);

  // Get data for the currently selected week dropdown
  const weekDates = getWeekDates(activeWeekIndex);
  
  // Calculate live hours for the table if active today
  const getDisplayHours = (dateStr) => {
    const baseHours = dailyLogs[dateStr]?.hoursWorked || 0;
    if (isActive && dateStr === getLocalFormattedDate()) {
      return baseHours + (sessionSeconds / 3600);
    }
    return baseHours;
  };

  const donutData = {
    labels: ['Completed', 'Remaining'],
    datasets: [{
      data: [totalHoursDone, Math.max(0, GOAL_HOURS - totalHoursDone)],
      backgroundColor: ['#a8c7fa', '#37393b'],
      borderColor: '#1e1f20',
      borderWidth: 2,
    }]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '50%',
    plugins: {
      legend: { display: true, position: 'bottom', labels: { color: '#e3e3e3' } }
    }
  };

  return (
    <div className="min-h-screen bg-googleBg text-googleText p-4 md:p-10">
      <div className="max-w-6xl mx-auto">

        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">VaultBoy's Internship Tracker</h1>
            <p className="text-googleSecondary">Penetration Testing (8 Weeks)</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isActive ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-sm font-medium">{isActive ? 'LIVE SESSION' : 'IDLE'}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="md:col-span-2 bg-googleCard p-8 rounded-[32px] flex flex-col justify-between min-h-[300px]">
            <div>
              <span className="text-googleSecondary flex items-center gap-2 text-sm uppercase tracking-widest font-medium">
                <Clock size={16} /> Current Session
              </span>
              <div className="text-7xl md:text-8xl font-bold tracking-tighter mt-4 font-mono">
                {formatTime(sessionSeconds)}
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={toggleTimer}
                className={`flex-1 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                  isActive ? 'bg-red-200 text-red-900 hover:bg-red-300' : 'bg-googleBlue text-blue-900 hover:opacity-90'
                }`}
              >
                {isActive ? <><Square size={20} /> Stop Session</> : <><Play size={20} /> Start Working</>}
              </button>
              <button 
                onClick={addSmokeBreak}
                className="flex-1 py-4 rounded-full border border-gray-600 text-googleBlue font-medium hover:bg-white/5 transition-all"
              >
                + Smoking Break
              </button>
            </div>
          </div>

          <div className="bg-googleCard p-8 rounded-[32px] flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-orange-500/10 rounded-full mb-4">
               <span className="text-orange-400 text-xs font-bold">TOTAL BREAKS</span>
            </div>
            <div className="text-8xl font-light text-orange-200">{smokeBreaks}</div>
            <p className="text-googleSecondary mt-4">Smoking breaks taken during internship</p>
          </div>

          <div className="md:col-span-2 bg-googleCard p-8 rounded-[32px]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-medium flex items-center gap-2">
                  <Activity size={20} className="text-googleBlue" /> Weekly Timeline
                </h3>
                <select 
                  value={activeWeekIndex} 
                  onChange={(e) => setActiveWeekIndex(Number(e.target.value))}
                  className="bg-[#28292a] text-googleSecondary border border-[#37393b] rounded-lg px-3 py-1 outline-none focus:border-googleBlue"
                >
                  {[...Array(8)].map((_, i) => (
                    <option key={i} value={i} className="bg-[#1e1f20] text-googleText">
                      Week {i + 1} {i === currentWeekIndex ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-googleSecondary">5 AM - 11 PM</span>
            </div>
            <WeeklyTimeline 
              weekDates={weekDates}
              dailyLogs={dailyLogs} 
              isActive={isActive} 
              sessionStartTime={sessionStartTime} 
            />
          </div>

          <div className="bg-googleCard p-8 rounded-[32px] flex flex-col items-center">
            <h3 className="text-lg font-medium mb-6">Progress to 400h</h3>
            <div className="relative w-full h-[200px]">
              <Doughnut data={donutData} options={pieOptions} />
            </div>
            <div className="mt-6 text-center">
              <div className="text-2xl font-bold text-googleBlue">{totalHoursDone}h</div>
              <div className="text-xs text-googleSecondary uppercase tracking-widest">Total Hours Recorded</div>
            </div>
          </div>
        </div>

        <div className="bg-googleCard p-8 rounded-[32px]">
          <h3 className="text-xl font-medium mb-6 text-googleText">Daily Breakdown (Week {activeWeekIndex + 1})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-4 px-4 text-googleSecondary font-medium">Date</th>
                  <th className="py-4 px-4 text-googleSecondary font-medium">Day</th>
                  <th className="py-4 px-4 text-googleSecondary font-medium">Time Worked (Hours)</th>
                  <th className="py-4 px-4 text-googleSecondary font-medium">Smoke Breaks</th>
                </tr>
              </thead>
              <tbody>
                {weekDates.map((dayInfo) => {
                  const log = dailyLogs[dayInfo.dateStr] || { smokeBreaks: 0 };
                  const hours = getDisplayHours(dayInfo.dateStr);
                  
                  return (
                    <tr key={dayInfo.dateStr} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 text-gray-400">{dayInfo.dateStr}</td>
                      <td className="py-4 px-4 font-medium">{dayInfo.dayName}</td>
                      <td className="py-4 px-4">
                        {hours > 0 ? (
                          <span className="text-googleBlue font-bold">{hours.toFixed(2)}h</span>
                        ) : (
                          <span className="text-gray-500">0.00h</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {log.smokeBreaks > 0 ? (
                          <span className="text-orange-300 font-bold">{log.smokeBreaks}</span>
                        ) : (
                          <span className="text-gray-500">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}