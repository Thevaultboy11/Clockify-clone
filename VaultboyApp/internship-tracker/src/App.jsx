import React, { useState, useEffect, useRef } from 'react';
import { Line, Doughnut, Pie } from 'react-chartjs-2';
import { Play, Square, Clock, TrendingUp } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import initialData from './data.json';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const GOAL_HOURS = 400;

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [smokeBreaks, setSmokeBreaks] = useState(0);
  const [dailyData, setDailyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef(null);

  // Subscribe to Firebase real-time updates
  useEffect(() => {
    // We are storing everything in a single document: stats -> internship
    const docRef = doc(db, 'stats', 'internship');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTotalSeconds(data.totalSeconds || 0);
        setSmokeBreaks(data.smokeBreaks || 0);
        setDailyData(data.dailyData || initialData.dailyData);
      } else {
        // Initialize the document in Firebase if it doesn't exist yet
        setDoc(docRef, {
          totalSeconds: 0,
          smokeBreaks: 0,
          dailyData: initialData.dailyData
        }).catch(err => console.error("Could not init firebase document:", err));
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase error (make sure your config is correct):", error);
      setDailyData(initialData.dailyData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper to update Firebase
  const updateFirebase = async (updates) => {
    try {
      const docRef = doc(db, 'stats', 'internship');
      await setDoc(docRef, updates, { merge: true });
    } catch (err) {
      console.error("Error updating Firebase:", err);
    }
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
        setTotalSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  const toggleTimer = () => {
    if (isActive) {
      // Stopping the timer - this is when we sync everything at once!
      if (sessionSeconds > 0 && dailyData.length > 0) {
        const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
        const newData = [...dailyData];
        newData[todayIndex] = {
          ...newData[todayIndex],
          hoursWorked: newData[todayIndex].hoursWorked + (sessionSeconds / 3600)
        };
        setDailyData(newData);
        updateFirebase({ dailyData: newData, totalSeconds });
      }
      setSessionSeconds(0);
    }
    setIsActive(!isActive);
  };
  
  const addSmokeBreak = () => {
    const updatedBreaks = smokeBreaks + 1;
    setSmokeBreaks(updatedBreaks);
    
    if (dailyData.length > 0) {
      const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
      setDailyData(prev => {
        const newData = [...prev];
        newData[todayIndex] = {
          ...newData[todayIndex],
          smokeBreaks: newData[todayIndex].smokeBreaks + 1
        };
        // Update both smokeBreaks and dailyData in one go
        updateFirebase({ smokeBreaks: updatedBreaks, dailyData: newData });
        return newData;
      });
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

  const totalHoursDone = (totalSeconds / 3600).toFixed(2);

  const lineData = {
    labels: dailyData.map(d => d.day),
    datasets: [{
      label: 'Hours Worked',
      data: dailyData.map(d => d.hoursWorked),
      borderColor: '#a8c7fa',
      backgroundColor: 'rgba(168, 199, 250, 0.2)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#a8c7fa'
    }]
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: '#28292a',
        titleColor: '#e3e3e3',
        bodyColor: '#e3e3e3',
        borderColor: '#37393b',
        borderWidth: 1
      }
    },
    scales: {
      y: { grid: { color: '#333' }, ticks: { color: '#8e918f' } },
      x: { grid: { display: false }, ticks: { color: '#8e918f' } }
    }
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
        
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">VaultBoy's Internship Tracker</h1>
            <p className="text-googleSecondary">Penetration Testing</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isActive ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-sm font-medium">{isActive ? 'LIVE SESSION' : 'IDLE'}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Timer Card */}
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

          {/* Smoking Stats Card */}
          <div className="bg-googleCard p-8 rounded-[32px] flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-orange-500/10 rounded-full mb-4">
               <span className="text-orange-400 text-xs font-bold">TOTAL BREAKS</span>
            </div>
            <div className="text-8xl font-light text-orange-200">{smokeBreaks}</div>
            <p className="text-googleSecondary mt-4">Smoking breaks taken during internship</p>
          </div>

          {/* Line Chart Card */}
          <div className="md:col-span-2 bg-googleCard p-8 rounded-[32px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium flex items-center gap-2">
                <TrendingUp size={20} className="text-googleBlue" /> Weekly Activity
              </h3>
              <span className="text-sm text-googleSecondary">Unit: Hours</span>
            </div>
            <div className="h-[250px]">
              <Line data={lineData} options={chartOptions} />
            </div>
          </div>

          {/* Chart.js Doughnut Card */}
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

        {/* Daily Breakdown Table */}
        <div className="bg-googleCard p-8 rounded-[32px]">
          <h3 className="text-xl font-medium mb-6 text-googleText">Daily Breakdown</h3>
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
                {dailyData.map((data, index) => (
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
