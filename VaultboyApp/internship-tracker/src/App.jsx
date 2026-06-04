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
import initialData from './data.json';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

const GOAL_HOURS = 400;

// Helper component for 8am - 6pm Weekly Timeline
const WeeklyTimeline = ({ dailyData, isActive, sessionStartTime }) => {
  const START_HOUR = 8;
  const END_HOUR = 18;
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

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  return (
    <div className="relative h-[300px] w-full bg-[#1e1f20] rounded-xl flex border border-gray-800">
      <div className="flex flex-col justify-between text-googleSecondary text-xs py-3 px-4 border-r border-gray-800 shrink-0 mt-8">
        <span>8 AM</span>
        <span>10 AM</span>
        <span>12 PM</span>
        <span>2 PM</span>
        <span>4 PM</span>
        <span>6 PM</span>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {dailyData.map((dayData, index) => {
          const sessions = dayData.sessions || [];
          const isToday = index === todayIndex;
          
          return (
            <div key={dayData.day} className="flex-1 flex flex-col border-r border-gray-800 last:border-0">
              <div className={`text-center py-2 text-xs font-medium border-b border-gray-800 ${isToday ? 'text-googleBlue bg-googleBlue/10' : 'text-googleSecondary'}`}>
                {dayData.day}
              </div>
              <div className="relative flex-1 mx-1 my-3 bg-[#28292a] rounded-md">
                {sessions.map((session, i) => {
                  const { top, height } = getPositionAndHeight(session.start, session.end);
                  if (height === '0%') return null;
                  return (
                    <div 
                      key={i} 
                      className="absolute left-0 w-full bg-googleBlue/70 border-l-2 border-googleBlue"
                      style={{ top, height }}
                    />
                  );
                })}
                {isToday && isActive && sessionStartTime && (
                  (() => {
                    const { top, height } = getPositionAndHeight(sessionStartTime, Date.now());
                    if (height === '0%') return null;
                    return (
                      <div 
                        className="absolute left-0 w-full bg-green-500/50 border-l-2 border-green-400 animate-pulse"
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
  
  const [weeksData, setWeeksData] = useState([]);
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef(null);

  useEffect(() => {
    // June 1, 2026 is the start date
    const startDate = new Date('2026-06-01T00:00:00+02:00').getTime();
    const now = Date.now();
    let diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    let weekIndex = Math.floor(diffDays / 7);
    if (weekIndex < 0) weekIndex = 0;
    if (weekIndex > 7) weekIndex = 7;
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
          setTotalSeconds(data.totalSeconds || 0);
          setSmokeBreaks(data.smokeBreaks || 0);
          
          let fetchedWeeks = data.weeks;
          
          // Migrate schema if needed
          if (!fetchedWeeks) {
             fetchedWeeks = initialData.weeks;
             await setDoc(docRef, {
               totalSeconds: initialData.totalSeconds,
               smokeBreaks: data.smokeBreaks || 0,
               weeks: fetchedWeeks,
               isActive: false,
               sessionStartTime: null
             }, { merge: true });
             setTotalSeconds(initialData.totalSeconds);
          }
          
          setWeeksData(fetchedWeeks);
          setIsActive(data.isActive || false);
          setSessionStartTime(data.sessionStartTime || null);
        } else {
          await setDoc(docRef, {
            totalSeconds: initialData.totalSeconds,
            smokeBreaks: 0,
            weeks: initialData.weeks,
            isActive: false,
            sessionStartTime: null
          });
          setWeeksData(initialData.weeks);
          setTotalSeconds(initialData.totalSeconds);
        }
      } catch (error) {
        console.error("Firebase error:", error);
        setWeeksData(initialData.weeks);
        setTotalSeconds(initialData.totalSeconds);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const updateFirebase = async (updates) => {
    try {
      const docRef = doc(db, 'stats', 'internship');
      await setDoc(docRef, updates, { merge: true });
    } catch (err) {
      console.error("Error updating Firebase:", err);
    }
  };

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

  const toggleTimer = () => {
    if (isActive) {
      const elapsed = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
      if (elapsed > 0 && weeksData.length > 0) {
        const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
        const newWeeks = [...weeksData];
        const currentWeek = [...newWeeks[currentWeekIndex]];
        currentWeek[todayIndex] = {
          ...currentWeek[todayIndex],
          hoursWorked: currentWeek[todayIndex].hoursWorked + (elapsed / 3600),
          sessions: [...(currentWeek[todayIndex].sessions || []), { start: sessionStartTime, end: Date.now() }]
        };
        newWeeks[currentWeekIndex] = currentWeek;
        
        setWeeksData(newWeeks);
        setTotalSeconds(prev => prev + elapsed);
        setIsActive(false);
        setSessionStartTime(null);

        updateFirebase({ 
          weeks: newWeeks, 
          totalSeconds: totalSeconds + elapsed,
          isActive: false,
          sessionStartTime: null
        });
      } else {
        setIsActive(false);
        setSessionStartTime(null);
        updateFirebase({ isActive: false, sessionStartTime: null });
      }
    } else {
      const now = Date.now();
      setIsActive(true);
      setSessionStartTime(now);
      updateFirebase({ isActive: true, sessionStartTime: now });
    }
  };
  
  const addSmokeBreak = () => {
    const updatedBreaks = smokeBreaks + 1;
    setSmokeBreaks(updatedBreaks);
    
    if (weeksData.length > 0) {
      const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
      const newWeeks = [...weeksData];
      const currentWeek = [...newWeeks[currentWeekIndex]];
      currentWeek[todayIndex] = {
        ...currentWeek[todayIndex],
        smokeBreaks: currentWeek[todayIndex].smokeBreaks + 1
      };
      newWeeks[currentWeekIndex] = currentWeek;
      
      setWeeksData(newWeeks);
      updateFirebase({ smokeBreaks: updatedBreaks, weeks: newWeeks });
    } else {
      updateFirebase({ smokeBreaks: updatedBreaks });
    }
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
        Connecting to Firebase...
      </div>
    );
  }

  const displayTotalSeconds = totalSeconds + (isActive ? sessionSeconds : 0);
  const totalHoursDone = (displayTotalSeconds / 3600).toFixed(2);

  const displayDailyData = weeksData[activeWeekIndex] ? [...weeksData[activeWeekIndex]] : [];
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const isViewingCurrentWeek = activeWeekIndex === currentWeekIndex;

  if (isActive && displayDailyData.length > 0 && isViewingCurrentWeek) {
    displayDailyData[todayIndex] = {
      ...displayDailyData[todayIndex],
      hoursWorked: displayDailyData[todayIndex].hoursWorked + (sessionSeconds / 3600)
    };
  }

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
      legend: { 
        display: true, 
        position: 'bottom',
        labels: { color: '#e3e3e3' }
      } 
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
              <span className="text-sm text-googleSecondary">8 AM - 6 PM</span>
            </div>
            <WeeklyTimeline 
              dailyData={displayDailyData} 
              isActive={isViewingCurrentWeek ? isActive : false} 
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
                  <th className="py-4 px-4 text-googleSecondary font-medium">Day</th>
                  <th className="py-4 px-4 text-googleSecondary font-medium">Time Worked (Hours)</th>
                  <th className="py-4 px-4 text-googleSecondary font-medium">Smoke Breaks</th>
                </tr>
              </thead>
              <tbody>
                {displayDailyData.map((data, index) => (
                  <tr key={data.day} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-medium">{data.day}</td>
                    <td className="py-4 px-4">
                      {data.hoursWorked > 0 ? (
                        <span className="text-googleBlue font-bold">{data.hoursWorked.toFixed(2)}h</span>
                      ) : (
                        <span className="text-gray-500">0.00h</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {data.smokeBreaks > 0 ? (
                        <span className="text-orange-300 font-bold">{data.smokeBreaks}</span>
                      ) : (
                        <span className="text-gray-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
