
import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import VoiceAnalysisModal from './components/VoiceAnalysisModal';
import AnalysisResultsScreen from './components/AnalysisResultsScreen';
import CalibrationScreen from './components/CalibrationScreen';
import VoiceCalibrationScreen from './components/VoiceCalibrationScreen';
import PostAnalysisSuggestionsScreen from './components/PostAnalysisSuggestionsScreen';
import ConnectTheDots from './components/ConnectTheDots';
import ConfirmationPopup from './components/ConfirmationPopup';
import EnrollmentNumber from './components/EnrollmentNumber';
import PinCreationScreen from './components/PinCreationScreen';
import SuccessPopup from './components/SuccessPopup';
import SignInScreen from './components/SignInScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDetailScreen from './components/StudentDetailScreen';
import StudentReportScreen from './components/StudentReportScreen';
import PreRecordingQuestionnaire from './components/PreRecordingQuestionnaire';
import SessionPlanningPage from './components/SessionPlanningPage';
import StreamChatProvider from './components/StreamChatProvider';
import { AnimatePresence, motion } from 'framer-motion';
import { BeamsBackground } from './components/ui/beams-background';
import { GlassFilter } from './components/ui/liquid-radio';
import type { AnalysisData, Student, PreAnalysisSession } from './types';
import type { QuestionnaireAnswers } from './components/PreRecordingQuestionnaire';
import { OnboardingService } from './services/onboardingService';
import { StorageService } from './services/storageService';

type AppState = 'SIGNIN' | 'SIGNUP' | 'CONFIRMATION' | 'ENROLLMENT' | 'PIN_CREATION' | 'SUCCESS' | 'DASHBOARD' | 'QUESTIONNAIRE' | 'RECORDING' | 'CALIBRATION_FLOW' | 'RESULTS' | 'SUGGESTIONS' | 'TEACHER_DASHBOARD' | 'STUDENT_DETAIL' | 'STUDENT_REPORT' | 'SESSION_PLANNING';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('SIGNIN');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [baselineData, setBaselineData] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [preAnalysisSession, setPreAnalysisSession] = useState<PreAnalysisSession | null>(null);
  const [planningStudentId, setPlanningStudentId] = useState<string | null>(null);

  // HACK: Cast motion.div to any to fix type errors
  const MotionDiv = motion.div as any;

  // Signup flow state
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [enrollmentNumber, setEnrollmentNumber] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const loadStudentData = useCallback(async () => {
    // Always pull global data when online (contains teacher-assigned tasks for students)
    if (navigator.onLine) {
      await StorageService.pullGlobalData(['global']);
    }

    // Get all student data using Hybrid Storage
    const studentsData = StorageService.getItem<Student[]>('allStudentsData');
    if (studentsData) {
      setStudents(studentsData);
    } else {
      setStudents([]);
    }
  }, [appState]);

  useEffect(() => {
    const userData = StorageService.getItem<any>('userData');
    if (userData) {
      const studentId = userData.accountNumber;
      if (studentId) {
        setAccountNumber(studentId);
        const baselineKey = `voiceBaseline_${studentId}`;
        const storedBaseline = StorageService.getItem<string>(baselineKey) || StorageService.getItem<string>('voiceBaseline');
        if (storedBaseline) {
          setBaselineData(storedBaseline);
        }

        // Pull latest data from Firebase if signed in
        StorageService.pullFromFirebase(studentId);
      }
    }

    // Load real student data on initial mount
    loadStudentData();
  }, [loadStudentData]);

  // Reload student data when teacher dashboard is shown
  useEffect(() => {
    if (appState === 'TEACHER_DASHBOARD') {
      loadStudentData();
    }
  }, [appState, loadStudentData]);

  // --- Browser Back Button Handling ---
  const isBackNavigation = React.useRef(false);
  const isSessionPlanDirtyRef = React.useRef(false);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Check for unsaved changes in Session Planning or Active Recording
      // We can't synchronously stop the popstate, but we can detect it and push state back if needed
      if (appState === 'SESSION_PLANNING' && isSessionPlanDirtyRef.current) {
        const confirmLeave = window.confirm("You have unsaved changes in your session plan. Are you sure you want to leave?");
        if (!confirmLeave) {
          window.history.pushState({ appState: 'SESSION_PLANNING' }, '', '#session-planning');
          return;
        }
      }

      if (appState === 'RECORDING') {
        const confirmLeave = window.confirm("An active recording is in progress. Navigating back will end the session and lose any unsaved analysis. Are you sure?");
        if (!confirmLeave) {
          window.history.pushState({ appState: 'RECORDING' }, '', '#recording');
          return;
        }
      }

      if (event.state && event.state.appState) {
        isBackNavigation.current = true;
        setAppState(event.state.appState);
      } else {
        // Fallback: If hitting back takes us to a state without our app state (e.g. empty history entry)
        // Default to Dashboard if we are logged in, or Signin otherwise.
        // For simplicity, handle null state as a "reset" to Dashboard if user seems logged in.
        // But this depends on implementation. Safe fallback:
        // isBackNavigation.current = true; // prevent loop
        // setAppState('DASHBOARD'); 
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [appState]); // Depend on appState so the closure sees the current value

  useEffect(() => {
    // Sync React State -> Browser History
    if (isBackNavigation.current) {
      isBackNavigation.current = false;
      return;
    }

    // Define "Root" states that should REPLACE history, not PUSH
    // This prevents "Back" from looping between Dashboard states or going back to Signin when on Dashboard
    const performReplace = ['SIGNIN', 'DASHBOARD', 'TEACHER_DASHBOARD'].includes(appState);

    // If we are just starting up (and history is empty-ish), replace
    // But generally:
    // Dashboard -> Questionnaire (PUSH)
    // Questionnaire -> Back (POP) -> Dashboard

    // Construct a friendly URL hash or path if desired, or just use state object
    const urlHash = `#${appState.toLowerCase().replace('_', '-')}`;

    if (performReplace) {
      window.history.replaceState({ appState }, '', urlHash);
    } else {
      window.history.pushState({ appState }, '', urlHash);
    }

  }, [appState]);
  // ------------------------------------

  // Sign-in handlers
  const handleSignIn = useCallback(async (code: string, password: string, userType: 'student' | 'teacher') => {
    setUserType(userType);

    if (userType === 'teacher') {
      // Teacher authentication with admin credentials
      const adminCode = '9999';
      const adminPassword = 'admin123';

      if (code === adminCode && password === adminPassword) {
        StorageService.setItem('isTeacherSignedIn', true, 'admin');
        // Reload student data
        loadStudentData();
        setAppState('TEACHER_DASHBOARD');
      } else {
        throw new Error('Invalid admin credentials');
      }
    } else {
      // Student authentication - check all student accounts

      // FIREBASE LOGIC
      try {
        // 1. Check Firebase first (Source of Truth)
        const firebaseData = await StorageService.getUserDataFromFirebase(code);

        if (firebaseData) {
          // Verify password
          let isPasswordValid = false;
          // Handlewrapped values (legacy or simple)
          const storedPassword = firebaseData.password || (firebaseData.value && firebaseData.value.password);

          if (storedPassword === password) {
            isPasswordValid = true;
          }

          if (isPasswordValid) {
            // Login successful from Firebase data
            const userData = firebaseData.value ? firebaseData.value : firebaseData; // Unwrap if needed

            // SYNC BACK TO LOCAL (Persistence)
            StorageService.setItem('userData', userData, code, 'state');
            StorageService.setItem('isSignedIn', true, code, 'state');

            // Also ensure it's in the accounts list for local history
            let accounts = StorageService.getItem<any[]>('studentAccounts') || [];
            if (!accounts.find((acc: any) => acc.accountNumber === code)) {
              accounts.push(userData);
              StorageService.setItem('studentAccounts', accounts, code, 'state');
            }

            setAccountNumber(code);

            // Sync Onboarding State if missing locally
            try {
              // If it's a new device, initialize local onboarding state based on some heuristic or just default
              // In a real app we'd sync onboarding state from Firebase too.
              // For now, let's ensure the service knows about this user
              OnboardingService.initializeForNewUser(code);

              // If they have a baseline, assume they finished onboarding
              if (userData.voiceBaseline) {
                OnboardingService.skipOnboarding(code);
              }
            } catch (e) { console.warn("Onboarding sync warning", e); }

            // Check for baseline
            if (userData.voiceBaseline) {
              const baselineData = typeof userData.voiceBaseline === 'string' ? userData.voiceBaseline : JSON.stringify(userData.voiceBaseline);
              StorageService.setItem(`voiceBaseline_${code}`, baselineData, code, 'state');
              setBaselineData(baselineData);
            }

            setAppState('DASHBOARD');
            return;
          } else {
            throw new Error('Invalid credentials');
          }
        }
      } catch (e) {
        console.log("Firebase login check failed or user not in firebase, checking local...", e);
      }

      // 2. Fallback to Local Storage (Offline or Legacy)
      let studentAccounts = StorageService.getItem<any[]>('studentAccounts') || [];

      // Backward compatibility: Migrate old userData to studentAccounts if it exists
      if (studentAccounts.length === 0) {
        const oldUserData = localStorage.getItem('userData');
        if (oldUserData) {
          try {
            const parsedOldData = JSON.parse(oldUserData);
            // Migrate old account to new format
            studentAccounts = [parsedOldData];
            StorageService.setItem('studentAccounts', studentAccounts, 'migration_user', 'state');
          } catch (error) {
            console.error('Error migrating old user data:', error);
          }
        }
      }

      if (studentAccounts.length === 0) {
        throw new Error('No account found. Please create an account first.');
      }

      // Find the account matching the provided credentials
      const matchingAccount = studentAccounts.find((account: any) =>
        account.accountNumber === code && account.password === password
      );

      if (matchingAccount) {
        // Store the current user's data for the session
        StorageService.setItem('userData', matchingAccount, matchingAccount.accountNumber);
        StorageService.setItem('isSignedIn', true, matchingAccount.accountNumber);
        setAccountNumber(matchingAccount.accountNumber);

        // Load user-specific baseline
        const baselineKey = `voiceBaseline_${matchingAccount.accountNumber}`;
        const userBaseline = StorageService.getItem<string>(baselineKey);
        if (userBaseline) {
          setBaselineData(userBaseline);
        } else {
          setBaselineData(null);
        }

        setAppState('DASHBOARD');
      } else {
        throw new Error('Invalid credentials');
      }
    }
  }, [loadStudentData]);

  const handleCreateAccount = useCallback(() => {
    setAppState('SIGNUP');
  }, []);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('isSignedIn');
    localStorage.removeItem('isTeacherSignedIn');
    setAppState('SIGNIN');
  }, []);

  const handleSelectStudent = useCallback((studentCode: string) => {
    const student = students.find(s => s.code === studentCode);
    if (student) {
      setSelectedStudent(student);
      setAppState('STUDENT_DETAIL');
    }
  }, [students]);

  const handleBackToTeacherDashboard = useCallback(() => {
    loadStudentData();
    setSelectedStudent(null);
    setAppState('TEACHER_DASHBOARD');
  }, [loadStudentData]);

  // Signup flow handlers
  const handleClassSectionConnect = useCallback((classNum: number, section: string) => {
    setSelectedClass(classNum);
    setSelectedSection(section);
    setShowConfirmation(true);
  }, []);

  const handleConfirmationConfirm = useCallback(() => {
    setShowConfirmation(false);
    setAppState('ENROLLMENT');
  }, []);

  const handleConfirmationRetry = useCallback(() => {
    setShowConfirmation(false);
    setSelectedClass(null);
    setSelectedSection(null);
  }, []);

  const handleEnrollmentSubmit = useCallback((enrollment: string) => {
    setEnrollmentNumber(enrollment);
    // Move directly to custom PIN creation
    setAppState('PIN_CREATION');
  }, []);

  const handlePinCreationComplete = useCallback((pin: string, password: string) => {
    setAccountNumber(pin); // Store the custom PIN as account number

    // Store signup data in the accounts array to support multiple accounts
    const newAccountData = {
      class: selectedClass,
      section: selectedSection,
      enrollment: enrollmentNumber,
      accountNumber: pin,
      password: password
    };

    // Get existing student accounts or create new array
    let studentAccounts = StorageService.getItem<any[]>('studentAccounts') || [];

    // Check if account already exists (shouldn't happen, but just in case)
    const accountIndex = studentAccounts.findIndex((acc: any) => acc.accountNumber === pin);

    if (accountIndex === -1) {
      // Add new account to the array
      studentAccounts.push(newAccountData);
      StorageService.setItem('studentAccounts', studentAccounts, pin, 'state');
    } else {
      // Update existing account (shouldn't normally happen)
      studentAccounts[accountIndex] = newAccountData;
      StorageService.setItem('studentAccounts', studentAccounts, pin, 'state');
    }

    // Store current user data for the session (auto-sign in after successful signup)
    StorageService.setItem('isSignedUp', true, pin, 'state');
    StorageService.setItem('isSignedIn', true, pin, 'state');
    StorageService.setItem('userData', newAccountData, pin, 'state');

    // Add student to allStudentsData immediately so teacher can see them
    let studentsData: Student[] = StorageService.getItem<Student[]>('allStudentsData') || [];

    // Check if student already exists (shouldn't happen, but just in case)
    const studentIndex = studentsData.findIndex(s => s.code === pin);

    if (studentIndex === -1) {
      // Create new student entry with empty analysisHistory
      const newStudent: Student = {
        code: pin,  // Use 'pin' directly, not 'accountNumber' state (which is async)
        name: enrollmentNumber || 'Unknown Student',
        class: selectedClass || 10,
        section: selectedSection || 'A',
        riskLevel: 'low', // Default to low risk until analysis is done
        analysisHistory: [] // Empty initially
      };
      studentsData.push(newStudent);

      // Save updated students data to SHARED teacher path for teacher access
      StorageService.setItem('allStudentsData', studentsData, '9999', 'global');

      // Update local state
      setStudents(studentsData);
    }

    // Initialize Onboarding for this new student
    OnboardingService.initializeForNewUser(pin);

    setAppState('SUCCESS');
  }, [selectedClass, selectedSection, enrollmentNumber, accountNumber]);

  const handleSuccessProceed = useCallback(() => {
    setAppState('DASHBOARD');
  }, []);

  const handleStartSession = useCallback(() => setAppState('QUESTIONNAIRE'), []);
  const handleStartCalibration = useCallback(() => setAppState('CALIBRATION_FLOW'), []);

  const handleQuestionnaireSubmit = useCallback((answers: QuestionnaireAnswers, questions?: any[]) => {
    setQuestionnaireAnswers(answers);

    // Construct PreAnalysisSession object
    const session: PreAnalysisSession = {
      sessionId: `preanalysis_${Date.now()}`,
      date: new Date().toISOString(),
      questions: questions || [],
      answers: answers as { [questionId: string]: string | number }
    };
    setPreAnalysisSession(session);

    // Optionally store in Hybrid Storage
    StorageService.setItem('questionnaireAnswers', answers, accountNumber, 'state');
    StorageService.setItem('currentPreAnalysisSession', session, accountNumber, 'state');
    setAppState('RECORDING');
  }, []);

  const handleQuestionnaireBack = useCallback(() => {
    setAppState('DASHBOARD');
  }, []);

  const handleCloseModal = useCallback(() => setAppState('DASHBOARD'), []);


  const handleAnalysisComplete = useCallback((data: AnalysisData) => {
    const { aiSummary, ...rest } = data;
    // Get questionnaire answers from Hybrid Storage if available
    const questionnaireAnswers = StorageService.getItem<QuestionnaireAnswers>('questionnaireAnswers');

    const analysisDataWithDate = {
      ...rest,
      aiSummary,
      date: new Date().toISOString(),
      questionnaireAnswers: questionnaireAnswers || undefined
    };
    setAnalysisData(analysisDataWithDate);

    // Save analysis data to student's history
    const userData = StorageService.getItem<any>('userData');
    if (userData) {
      try {
        const studentCode = userData.accountNumber;
        const studentName = userData.enrollment || 'Unknown Student';
        const studentClass = userData.class || 10;
        const studentSection = userData.section || 'A';

        // Get existing students data
        let studentsData = StorageService.getItem<Student[]>('allStudentsData') || [];

        // Find existing student or create new one
        let studentIndex = studentsData.findIndex(s => s.code === studentCode);

        if (studentIndex === -1) {
          // Create new student
          const newStudent: Student = {
            code: studentCode,
            name: studentName,
            class: studentClass,
            section: studentSection,
            riskLevel: data.stressLevel > 70 ? 'high' : data.stressLevel > 40 ? 'moderate' : 'low',
            analysisHistory: [analysisDataWithDate]
          };
          studentsData.push(newStudent);
        } else {
          // Update existing student
          studentsData[studentIndex].analysisHistory.push(analysisDataWithDate);
          // Update risk level based on latest analysis
          const latestStress = data.stressLevel;
          studentsData[studentIndex].riskLevel = latestStress > 70 ? 'high' : latestStress > 40 ? 'moderate' : 'low';
        }

        // Save updated students data to SHARED teacher path for teacher access
        StorageService.setItem('allStudentsData', studentsData, '9999', 'global');

        // Update local state
        setStudents(studentsData);
      } catch (error) {
        console.error('Error saving student data:', error);
      }
    }

    handleNextToSuggestions();
  }, []);

  const handleSelfReportSubmit = useCallback((score: number) => {
    setAnalysisData(prev => prev ? { ...prev, selfReportScore: score } : prev);
    try {
      const userData = StorageService.getItem<any>('userData');
      if (!userData) {
        return;
      }
      const { accountNumber } = userData;
      if (!accountNumber) return;

      const students = StorageService.getItem<Student[]>('allStudentsData') || [];
      const studentIndex = students.findIndex(s => s.code === accountNumber);
      if (studentIndex === -1 || students[studentIndex].analysisHistory.length === 0) return;

      const latestIndex = students[studentIndex].analysisHistory.length - 1;
      students[studentIndex].analysisHistory[latestIndex] = {
        ...students[studentIndex].analysisHistory[latestIndex],
        selfReportScore: score,
      };
      StorageService.setItem('allStudentsData', students, '9999', 'global');
      setStudents(students);
    } catch (error) {
      console.error('Failed to store self-report score', error);
    }
  }, []);

  const handleCalibrationComplete = useCallback((baselineJson: string) => {
    StorageService.setItem('voiceBaseline', baselineJson, 'global_baseline', 'state');
    setBaselineData(baselineJson);
    setAppState('DASHBOARD');
  }, []);

  const handleVoiceCalibrationComplete = useCallback((baselineJson: string) => {
    const baselineKey = accountNumber ? `voiceBaseline_${accountNumber}` : 'voiceBaseline';
    StorageService.setItem(baselineKey, baselineJson, accountNumber || 'default', 'state');
    setBaselineData(baselineJson);

    // Save baseline to account data for persistence
    const accounts = StorageService.getItem<any[]>('studentAccounts');
    if (accounts && accountNumber) {
      try {
        const updatedAccounts = accounts.map((acc: any) =>
          acc.accountNumber === accountNumber ? { ...acc, voiceBaseline: baselineJson } : acc
        );
        StorageService.setItem('studentAccounts', updatedAccounts, accountNumber, 'state');

        // Also update current userData in session
        const userData = StorageService.getItem<any>('userData');
        if (userData) {
          if (userData.accountNumber === accountNumber) {
            StorageService.setItem('userData', { ...userData, voiceBaseline: baselineJson }, accountNumber, 'state');
          }
        }

        // Advance onboarding state if needed
        OnboardingService.completeStep(accountNumber, 'calibration');
        const state = OnboardingService.getState(accountNumber);
        if (!state.hasSeenWelcome) {
          OnboardingService.completeStep(accountNumber, 'welcome');
        }
        // If they did calibration, they are fully setup
        OnboardingService.skipOnboarding(accountNumber);
      } catch (e) {
        console.error('Error updating account baseline:', e);
      }
    }

    setAppState('DASHBOARD');
  }, [accountNumber]);

  const handleResultsClose = useCallback(() => {
    setAnalysisData(null);
    setAppState('DASHBOARD');
  }, []);

  const handleNewRecordingFromResults = useCallback(() => {
    setAnalysisData(null);
    setAppState('RECORDING');
  }, []);

  const handleNextToSuggestions = useCallback(async () => {
    // Trigger confetti when navigating to suggestions
    const { triggerSideCannonsConfetti } = await import('./utils/confetti');
    // Small delay to ensure page transition starts and suggestions screen is visible
    setTimeout(() => {
      triggerSideCannonsConfetti();
    }, 500);
    setAppState('SUGGESTIONS');
  }, []);

  const handleSuggestionsBack = useCallback(() => {
    setAnalysisData(null);
    setAppState('DASHBOARD');
  }, []);

  const handleSuggestionsClose = useCallback(() => {
    setAnalysisData(null);
    setAppState('DASHBOARD');
  }, []);

  const handleReportClick = useCallback((analysis: AnalysisData) => {
    if (selectedStudent && analysis) {
      setAnalysisData(analysis);
      setAppState('STUDENT_REPORT');
    }
  }, [selectedStudent]);

  const handleSaveReport = useCallback((reportContent: string) => {
    if (selectedStudent && analysisData) {
      // 1. Update local analysisData state
      const updatedAnalysisData = { ...analysisData, counselorReport: reportContent };
      setAnalysisData(updatedAnalysisData);

      // 2. Update student in global students array
      try {
        const studentCode = selectedStudent.code;
        const studentsData = StorageService.getItem<Student[]>('allStudentsData') || [];
        const studentIndex = studentsData.findIndex(s => s.code === studentCode);

        if (studentIndex > -1) {
          // Find the specific analysis to update (matching date)
          const analysisIndex = studentsData[studentIndex].analysisHistory.findIndex(
            a => a.date === analysisData.date
          );

          if (analysisIndex > -1) {
            studentsData[studentIndex].analysisHistory[analysisIndex].counselorReport = reportContent;

            // 3. Persist to StorageService (triggers Firebase sync)
            StorageService.setItem('allStudentsData', studentsData, '9999', 'global'); // Admin/Teacher Global ID
            setStudents(studentsData);

            // 4. Update selectedStudent to reflect the change immediately
            setSelectedStudent(studentsData[studentIndex]);

            console.log("Report saved and syncing to Firebase...");
          }
        }
      } catch (error) {
        console.error("Failed to save report:", error);
      }
    }
  }, [selectedStudent, analysisData]);

  const handleReportBack = useCallback(() => {
    setAppState('STUDENT_DETAIL');
  }, []);

  // Session Planning handlers
  const handlePlanSession = useCallback((studentId: string) => {
    setPlanningStudentId(studentId);
    setAppState('SESSION_PLANNING');
  }, []);

  const handlePlanningBack = useCallback(() => {
    if (isSessionPlanDirtyRef.current) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to discard them?")) {
        return;
      }
    }
    setPlanningStudentId(null);
    setAppState('TEACHER_DASHBOARD');
  }, []);

  const handlePlanningSave = useCallback(() => {
    setPlanningStudentId(null);
    setAppState('TEACHER_DASHBOARD');
  }, []);

  // Handler for SessionPlanningPage to update dirty state
  const handleSessionPlanDirtyChange = useCallback((isDirty: boolean) => {
    isSessionPlanDirtyRef.current = isDirty;
  }, []);


  const pageVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.4, ease: 'easeInOut' }
  };

  return (
    <StreamChatProvider>
      <GlassFilter />
      <BeamsBackground intensity="medium" />
      <div className="min-h-screen w-full overflow-hidden relative">
        <AnimatePresence initial={false}>
          {/* Sign-in Screen */}
          {appState === 'SIGNIN' && (
            <MotionDiv
              key="signin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <SignInScreen
                onSignIn={handleSignIn}
                onCreateAccount={handleCreateAccount}
              />
            </MotionDiv>
          )}

          {/* Signup Flow Components */}
          {appState === 'SIGNUP' && (
            <MotionDiv
              key="signup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center pt-16"
            >
              <ConnectTheDots
                onConnect={handleClassSectionConnect}
                isEnabled={true}
                selectedClass={selectedClass}
              />
            </MotionDiv>
          )}

          {appState === 'ENROLLMENT' && (
            <MotionDiv
              key="enrollment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center pt-16"
            >
              <EnrollmentNumber onSubmit={handleEnrollmentSubmit} />
            </MotionDiv>
          )}

          {appState === 'PIN_CREATION' && (
            <MotionDiv
              key="pin-creation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center pt-4"
            >
              <PinCreationScreen
                onSubmit={handlePinCreationComplete}
              />
            </MotionDiv>
          )}

          {appState === 'DASHBOARD' && (
            <MotionDiv
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <Dashboard
                onStartVoiceSession={handleStartSession}
                onStartCalibration={handleStartCalibration}
                onSignOut={handleSignOut}
              />
            </MotionDiv>
          )}

          {appState === 'QUESTIONNAIRE' && (
            <MotionDiv
              key="questionnaire"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <PreRecordingQuestionnaire
                onSubmit={handleQuestionnaireSubmit}
                onBack={handleQuestionnaireBack}
                studentId={userType === 'student' ? accountNumber : (selectedStudent?.code || planningStudentId || undefined)}
              />
            </MotionDiv>
          )}

          {appState === 'TEACHER_DASHBOARD' && (
            <MotionDiv
              key="teacher-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <TeacherDashboard
                students={students}
                onSelectStudent={handleSelectStudent}
                onSignOut={handleSignOut}
                onRefresh={loadStudentData}
                onPlanSession={handlePlanSession}
              />
            </MotionDiv>
          )}

          {appState === 'STUDENT_DETAIL' && selectedStudent && (
            <MotionDiv
              key="student-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <StudentDetailScreen
                student={selectedStudent}
                onBack={handleBackToTeacherDashboard}
                isTeacherView={true}
                onReportClick={handleReportClick}
              />
            </MotionDiv>
          )}

          {appState === 'STUDENT_REPORT' && selectedStudent && analysisData && (
            <MotionDiv
              key="student-report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <StudentReportScreen
                student={selectedStudent}
                analysisData={analysisData}
                onBack={handleReportBack}
                onSaveReport={handleSaveReport}
              />
            </MotionDiv>
          )}

          {appState === 'SESSION_PLANNING' && planningStudentId && (
            <MotionDiv
              key="session-planning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <React.Suspense fallback={<div className="text-white text-center mt-20">Loading...</div>}>
                <SessionPlanningPage
                  studentId={planningStudentId}
                  studentName={students.find(s => s.code === planningStudentId)?.name}
                  onBack={handlePlanningBack}
                  onSave={handlePlanningSave}
                  onDirtyChange={handleSessionPlanDirtyChange}
                />
              </React.Suspense>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Popup Components */}
        <AnimatePresence>
          {showConfirmation && selectedClass && selectedSection && (
            <ConfirmationPopup
              classNumber={selectedClass}
              section={selectedSection}
              onConfirm={handleConfirmationConfirm}
              onRetry={handleConfirmationRetry}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'SUCCESS' && (
            <SuccessPopup
              accountNumber={accountNumber}
              onProceed={handleSuccessProceed}
            />
          )}
        </AnimatePresence>


        <AnimatePresence>
          {appState === 'RECORDING' && (
            <VoiceAnalysisModal
              onClose={handleCloseModal}
              onAnalysisReady={handleAnalysisComplete}
              baselineData={baselineData}
              audioBlob={recordedAudioBlob}
              preAnalysisSession={preAnalysisSession || undefined}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'CALIBRATION_FLOW' && (
            <MotionDiv
              key="calibration-screen"
              className="fixed inset-0 z-50 bg-background-primary overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <VoiceCalibrationScreen
                onClose={handleCloseModal}
                onCalibrationComplete={handleVoiceCalibrationComplete}
                studentId={userType === 'student' ? accountNumber : undefined}
              />
            </MotionDiv>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'RESULTS' && analysisData && (
            <MotionDiv
              key="results-page"
              className="fixed inset-0 z-50 bg-background-primary overflow-y-auto"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
            >
              <AnalysisResultsScreen
                analysisData={analysisData}
                onNewRecording={handleNewRecordingFromResults}
                onClose={handleResultsClose}
                onNext={handleNextToSuggestions}
                onSelfReportSubmit={handleSelfReportSubmit}
              />
            </MotionDiv>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appState === 'SUGGESTIONS' && analysisData && (
            <MotionDiv
              key="suggestions-page"
              className="fixed inset-0 z-50 bg-background-primary overflow-y-auto"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
            >
              <PostAnalysisSuggestionsScreen
                analysisData={analysisData}
                onBack={handleSuggestionsBack}
                onClose={handleSuggestionsClose}
              />
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </StreamChatProvider>
  );
};

export default App;
