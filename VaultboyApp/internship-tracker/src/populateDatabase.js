import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase'; // Make sure this path points to your firebase config

export const populateDatabase = async () => {
  console.log("Starting database migration to date-based architecture...");

  const newData = {
    // 65.5 hours total
    totalSeconds: 235800, 
    smokeBreaks: 0,
    isActive: false,
    sessionStartTime: null,
    // New Architecture: A dictionary mapped by exact dates
    dailyLogs: {
      "2026-06-01": {
        date: "2026-06-01",
        dayName: "Monday",
        hoursWorked: 9,
        smokeBreaks: 0,
        sessions: [{ start: 1780293600000, end: 1780326000000 }] // 8 AM - 5 PM
      },
      "2026-06-02": {
        date: "2026-06-02",
        dayName: "Tuesday",
        hoursWorked: 7.5,
        smokeBreaks: 0,
        sessions: [{ start: 1780385400000, end: 1780412400000 }] // 9:30 AM - 5 PM
      },
      "2026-06-03": {
        date: "2026-06-03",
        dayName: "Wednesday",
        hoursWorked: 8,
        smokeBreaks: 0,
        sessions: [{ start: 1780466400000, end: 1780495200000 }] // 8 AM - 4 PM
      },
      "2026-06-04": {
        date: "2026-06-04",
        dayName: "Thursday",
        hoursWorked: 8,
        smokeBreaks: 0,
        sessions: [{ start: 1780560000000, end: 1780588800000 }] // 10 AM - 6 PM
      },
      "2026-06-05": {
        date: "2026-06-05",
        dayName: "Friday",
        hoursWorked: 0,
        smokeBreaks: 0,
        sessions: [] // No sessions
      },
      "2026-06-06": {
        date: "2026-06-06",
        dayName: "Saturday",
        hoursWorked: 9,
        smokeBreaks: 0,
        sessions: [{ start: 1780726800000, end: 1780759200000 }] // 11 AM - 8 PM
      },
      "2026-06-07": {
        date: "2026-06-07",
        dayName: "Sunday",
        hoursWorked: 5,
        smokeBreaks: 0,
        sessions: [{ start: 1780826400000, end: 1780844400000 }] // 12 PM - 5 PM
      },
      "2026-06-08": {
        date: "2026-06-08",
        dayName: "Monday",
        hoursWorked: 9,
        smokeBreaks: 0,
        sessions: [{ start: 1780898400000, end: 1780930800000 }] // 8 AM - 5 PM
      },
      "2026-06-09": {
        date: "2026-06-09",
        dayName: "Tuesday",
        hoursWorked: 10,
        smokeBreaks: 0,
        sessions: [{ start: 1780984800000, end: 1781020800000 }] // 8 AM - 6 PM
      },
      "2026-06-10": {
        date: "2026-06-10",
        dayName: "Wednesday",
        hoursWorked: 0,
        smokeBreaks: 0,
        sessions: [] 
      },
      "2026-06-11": {
        date: "2026-06-11",
        dayName: "Thursday",
        hoursWorked: 0,
        smokeBreaks: 0,
        sessions: [] // Ready for you to hit Start today!
      }
    }
  };

  try {
    const docRef = doc(db, 'stats', 'internship');
    // We overwrite the entire document with the new architecture
    await setDoc(docRef, newData); 
    console.log("✅ Success! The database has been populated with the new date-based architecture.");
  } catch (error) {
    console.error("❌ Error populating database:", error);
  }
};