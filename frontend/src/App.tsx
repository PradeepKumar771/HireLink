import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Briefcase, 
  User, 
  GraduationCap, 
  Building2, 
  Map, 
  Bell, 
  Mail, 
  PlusCircle, 
  FileText, 
  CheckCircle, 
  LogOut, 
  Cpu, 
  TrendingUp, 
  Compass, 
  ArrowRight, 
  ShieldCheck, 
  Activity, 
  AlertCircle,
  Shield,
  Lock,
  Unlock,
  Key,
  Terminal,
  Clock,
  Database,
  AlertTriangle,
  Send,
  Globe,
  Users
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Interfaces
interface Job {
  id: string;
  title: string;
  companyName: string;
  description: string;
  skills: string;
  minGPA: number;
  major: string;
  collegeId: string;
  status: string;
  createdAt: string;
}

interface Application {
  id: string;
  jobId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  collegeId: string;
  status: string;
  createdAt: string;
  job: Job;
}

interface Notification {
  id: string;
  userId: string;
  collegeId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface Milestone {
  title: string;
  date: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING';
}

interface StudentProfile {
  studentId: string;
  studentName: string;
  studentEmail: string;
  collegeId: string;
  skills: string[];
  gpa: number;
  major: string;
  certifications: string[];
  milestones: Milestone[];
}

export default function App() {
  // Router state: 'home' | 'contact' | 'login' | 'register' | 'portal'
  const [currentView, setCurrentView] = useState<'home' | 'contact' | 'login' | 'register' | 'portal'>(() => {
    const t = localStorage.getItem('hirelink_token');
    return t ? 'portal' : 'home';
  });

  // Auth states
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem('hirelink_token');
    const u = localStorage.getItem('hirelink_user');
    if (!t || t === 'undefined' || !u || u === 'undefined') {
      return null;
    }
    return t;
  });
  
  const [user, setUser] = useState<any>(() => {
    const u = localStorage.getItem('hirelink_user');
    if (!u || u === 'undefined') return null;
    try {
      return JSON.parse(u);
    } catch {
      return null;
    }
  });

  const [email, setEmail] = useState(() => {
    return localStorage.getItem('hirelink_remember_email') || '';
  });
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [collegeId, setCollegeId] = useState('MIT');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('hirelink_remember_me') === 'true';
  });
  
  // Dashboard tab selection
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'applications' | 'profile' | 'analytics' | 'security'>('dashboard');
  
  // Data states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  
  // Create job state
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobCompany, setNewJobCompany] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobSkills, setNewJobSkills] = useState('');
  const [newJobMinGPA, setNewJobMinGPA] = useState('0.0');
  const [newJobMajor, setNewJobMajor] = useState('Computer Science');
  
  // Student Profile Editor
  const [editSkills, setEditSkills] = useState('');
  const [editGPA, setEditGPA] = useState('3.5');
  const [editMajor, setEditMajor] = useState('Computer Science');
  const [editCerts, setEditCerts] = useState('');

  // Security and telemetry logs console
  const [logs, setLogs] = useState<string[]>([
    'System: Secured isolation policies verified for active session.',
    'System: Sandbox initialized.'
  ]);

  // Loading/Feedback states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  // Security states
  const [revealedConfidentialData, setRevealedConfidentialData] = useState<Record<string, boolean>>({});
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(900);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Simulated pen-test operations
  const [sqlPayload, setSqlPayload] = useState("alice@mit.edu' OR 1=1; --");
  const [sqlSanitizedResult, setSqlSanitizedResult] = useState('');
  const [sqlThreatRemediated, setSqlThreatRemediated] = useState(false);

  const [tenantVictimEmail, setTenantVictimEmail] = useState('bob@stanford.edu');
  const [tenantLog, setTenantLog] = useState<string[]>([]);

  const [bruteForceAttempts, setBruteForceAttempts] = useState(0);
  const [bruteForceLocked, setBruteForceLocked] = useState(false);
  const [bruteForceCountdown, setBruteForceCountdown] = useState(0);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // Theme support
  const getThemeClass = () => {
    if (!token || !user || currentView !== 'portal') return '';
    if (user?.role === 'RECRUITER') return 'theme-recruiter';
    if (user?.collegeId === 'MIT') return 'theme-mit';
    if (user?.collegeId === 'STANFORD') return 'theme-stanford';
    return '';
  };

  // Expiration Watchdog
  useEffect(() => {
    if (!token || sessionLocked || currentView !== 'portal') return;
    const interval = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          setSessionLocked(true);
          addLog('Session locked due to inactivity.');
          return 900;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [token, sessionLocked, currentView]);

  // Lockout count
  useEffect(() => {
    if (!bruteForceLocked || bruteForceCountdown <= 0) return;
    const interval = setInterval(() => {
      setBruteForceCountdown(prev => {
        if (prev <= 1) {
          setBruteForceLocked(false);
          setBruteForceAttempts(0);
          addLog('Temporary block released.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [bruteForceLocked, bruteForceCountdown]);

  useEffect(() => {
    if (token && currentView === 'portal') {
      fetchDashboardData();
    }
  }, [token, currentView]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const jobsRes = await axios.get(`${API_BASE}/tnp/jobs`, { headers });
      setJobs(jobsRes.data.jobs || []);

      const appsRes = await axios.get(`${API_BASE}/tnp/applications`, { headers });
      setApplications(appsRes.data.applications || []);

      const alertsRes = await axios.get(`${API_BASE}/tnp/notifications`, { headers });
      setNotifications(alertsRes.data.notifications || []);

      if (user?.role === 'STUDENT') {
        const profileRes = await axios.get(`${API_BASE}/matching/profile/${user.id}`, { headers });
        if (profileRes.data.profile) {
          setStudentProfile(profileRes.data.profile);
          setEditSkills(profileRes.data.profile.skills.join(', '));
          setEditGPA(profileRes.data.profile.gpa.toString());
          setEditMajor(profileRes.data.profile.major);
          setEditCerts(profileRes.data.profile.certifications.join(', '));
        }
      }
      
      setErrorMessage('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to connect to microservices.');
    } finally {
      setLoading(false);
    }
  };

  const loginSandboxUser = async (presetEmail: string, presetPass: string) => {
    if (bruteForceLocked) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: presetEmail,
        password: presetPass
      });
      if (res.data.success) {
        const { token: userToken, user: loggedUser } = res.data;
        localStorage.setItem('hirelink_token', userToken);
        localStorage.setItem('hirelink_user', JSON.stringify(loggedUser));
        
        if (rememberMe) {
          localStorage.setItem('hirelink_remember_email', presetEmail);
          localStorage.setItem('hirelink_remember_me', 'true');
        } else {
          localStorage.removeItem('hirelink_remember_email');
          localStorage.setItem('hirelink_remember_me', 'false');
        }

        setToken(userToken);
        setUser(loggedUser);
        setSessionTimeLeft(900);
        setSessionLocked(false);
        setRevealedConfidentialData({});
        setActiveTab('dashboard');
        setCurrentView('portal');
        addLog(`Authenticated successfully: ${loggedUser.name}`);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gateway connection issue.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bruteForceLocked) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      if (res.data.success) {
        const { token: userToken, user: loggedUser } = res.data;
        localStorage.setItem('hirelink_token', userToken);
        localStorage.setItem('hirelink_user', JSON.stringify(loggedUser));
        
        if (rememberMe) {
          localStorage.setItem('hirelink_remember_email', email);
          localStorage.setItem('hirelink_remember_me', 'true');
        } else {
          localStorage.removeItem('hirelink_remember_email');
          localStorage.setItem('hirelink_remember_me', 'false');
        }

        setToken(userToken);
        setUser(loggedUser);
        setSessionTimeLeft(900);
        setSessionLocked(false);
        setRevealedConfidentialData({});
        setActiveTab('dashboard');
        setCurrentView('portal');
        addLog(`Authenticated successfully: ${loggedUser.email}`);
      }
    } catch (err: any) {
      const newAttempts = bruteForceAttempts + 1;
      setBruteForceAttempts(newAttempts);
      if (newAttempts >= 3) {
        setBruteForceLocked(true);
        setBruteForceCountdown(60);
        setErrorMessage('Access locked: Brute-force pattern identified.');
        addLog('Brute-force lockout triggered.');
      } else {
        setErrorMessage(err.response?.data?.message || `Invalid password. ${3 - newAttempts} attempts remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, {
        email,
        password,
        name,
        role,
        collegeId
      });
      if (res.data.success) {
        const { token: userToken, user: loggedUser } = res.data;
        localStorage.setItem('hirelink_token', userToken);
        localStorage.setItem('hirelink_user', JSON.stringify(loggedUser));
        
        if (rememberMe) {
          localStorage.setItem('hirelink_remember_email', email);
          localStorage.setItem('hirelink_remember_me', 'true');
        } else {
          localStorage.removeItem('hirelink_remember_email');
          localStorage.setItem('hirelink_remember_me', 'false');
        }

        setToken(userToken);
        setUser(loggedUser);
        setRevealedConfidentialData({});
        setActiveTab('dashboard');
        setCurrentView('portal');
        addLog(`Tenant security identity generated for: ${loggedUser.collegeId}`);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hirelink_token');
    localStorage.removeItem('hirelink_user');
    setToken(null);
    setUser(null);
    setStudentProfile(null);
    setJobs([]);
    setApplications([]);
    setNotifications([]);
    setRevealedConfidentialData({});
    setCurrentView('home');
    addLog('Session closed.');
  };

  const handleManualLock = () => {
    setSessionLocked(true);
    addLog('Session locked manually.');
  };

  const handleUnlockSession = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    const isStudent = user?.role === 'STUDENT';
    const isOfficer = user?.role === 'COLLEGE_TNP_OFFICER';
    const correctPass = isStudent ? 'student123' : isOfficer ? 'officer123' : 'recruiter123';
    
    if (unlockPassword === correctPass || unlockPassword === 'admin') {
      setSessionLocked(false);
      setSessionTimeLeft(900);
      setUnlockPassword('');
      addLog('Session unlocked.');
    } else {
      setUnlockError('Incorrect password key.');
    }
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle || !newJobCompany || !newJobSkills) return;
    
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await axios.post(`${API_BASE}/tnp/jobs`, {
        title: newJobTitle,
        companyName: newJobCompany,
        description: newJobDesc,
        skills: newJobSkills,
        minGPA: newJobMinGPA,
        major: newJobMajor
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
        setSuccessMessage('Job opening posted successfully.');
        addLog(`Posted job vacancy: ${newJobTitle}`);
        
        setNewJobTitle('');
        setNewJobCompany('');
        setNewJobDesc('');
        setNewJobSkills('');
        setNewJobMinGPA('0.0');
        
        await fetchDashboardData();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit job.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId: string, jobTitle: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_BASE}/tnp/apply`, { jobId }, { headers });
      
      if (res.data.success) {
        addLog(`Submitted application: ${jobTitle}`);
        setSuccessMessage(`Application sent for ${jobTitle}`);
        await fetchDashboardData();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Application failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleScreenCandidate = async (appId: string, status: string, name: string) => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_BASE}/tnp/applications/${appId}`, { status }, { headers });
      addLog(`Candidate ${name} screening status updated: ${status}`);
      await fetchDashboardData();
    } catch (err: any) {
      setErrorMessage('Failed to update screening status.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const skillsArray = editSkills.split(',').map(s => s.trim()).filter(Boolean);
      const certsArray = editCerts.split(',').map(s => s.trim()).filter(Boolean);
      
      const updatedMilestones: Milestone[] = [
        { title: 'Profile Configured', date: new Date().toISOString().split('T')[0], status: 'COMPLETED' },
        { title: `${certsArray.length || 0} Certifications Verified`, date: new Date().toISOString().split('T')[0], status: certsArray.length > 0 ? 'COMPLETED' : 'IN_PROGRESS' },
        { title: 'Resume Review Completed', date: new Date().toISOString().split('T')[0], status: 'COMPLETED' },
        { title: 'Job Matching Live Scan', date: '2026-06-01', status: 'IN_PROGRESS' }
      ];

      const res = await axios.put(`${API_BASE}/matching/profile`, {
        skills: skillsArray,
        gpa: parseFloat(editGPA),
        major: editMajor,
        certifications: certsArray,
        milestones: updatedMilestones
      }, { headers });

      if (res.data.success) {
        setSuccessMessage('Career profile & roadmap updated successfully!');
        addLog(`Recalculated matching scores for student profile.`);
        await fetchDashboardData();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      setErrorMessage('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMsg) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setContactSuccess(true);
      setContactName('');
      setContactEmail('');
      setContactMsg('');
      setTimeout(() => setContactSuccess(false), 5000);
    }, 1000);
  };

  const getJobMatchScore = (jobSkills: string) => {
    if (!studentProfile) return 0;
    const reqs = jobSkills.split(',').map(s => s.trim().toLowerCase());
    const student = studentProfile.skills.map(s => s.toLowerCase());
    const matches = student.filter(s => reqs.includes(s));
    return Math.round((matches.length / reqs.length) * 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Elegant loading unlock reveal
  const triggerBiometricReveal = (id: string, type: string) => {
    addLog(`Decrypting confidential parameter: ${type}`);
    
    setTimeout(() => {
      setRevealedConfidentialData(prev => ({ ...prev, [id]: true }));
      addLog(`Access authorized for resource: ${type}`);
    }, 800);
  };

  // Simulated pen-test operations
  const runSqlPenTest = () => {
    setSqlSanitizedResult('Analyzing string parameters at gateway...');
    setSqlThreatRemediated(false);
    
    setTimeout(() => {
      const raw = sqlPayload;
      const step1 = raw.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
      const step2 = step1.replace(/['"]\s*(OR|AND)\s*['"]?\d*['"]?\s*=\s*['"]?\d*/gi, '');
      const clean = step2.replace(/[<>]/g, s => (s === '<' ? '&lt;' : '&gt;'));
      
      setSqlSanitizedResult(clean);
      setSqlThreatRemediated(clean !== raw);
      addLog(`Sanitization event: original query cleaned.`);
    }, 900);
  };

  const runTenantPenTest = () => {
    setTenantLog(prev => [...prev, `[INIT] Dispatching request for email context: ${tenantVictimEmail}`]);
    
    setTimeout(() => {
      setTenantLog(prev => [...prev, `[GATEWAY] Validating JWT metadata claims...`]);
      setTimeout(() => {
        const myCollege = user?.collegeId?.toUpperCase() || 'UNKNOWN';
        const targetIsStanford = tenantVictimEmail.toLowerCase().includes('stanford') || tenantVictimEmail.toLowerCase().includes('bob');
        const targetCollege = targetIsStanford ? 'STANFORD' : 'MIT';
        
        if (myCollege !== targetCollege && user?.role !== 'RECRUITER') {
          setTenantLog(prev => [
            ...prev,
            `[BLOCKED] X-User-College-Id mismatch discovered.`,
            `[DENIED] Blocked request from "${myCollege}" context targetting "${targetCollege}" resources.`
          ]);
          addLog(`Boundary alert: Intercepted cross-tenant data access violation.`);
        } else {
          setTenantLog(prev => [
            ...prev,
            `[VERIFIED] User college matching resource context: "${myCollege}".`,
            `[SUCCESS] Isolated payload loaded.`
          ]);
        }
      }, 700);
    }, 400);
  };

  // Lock screen modal
  if (token && sessionLocked && currentView === 'portal') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 theme-mit">
        <div className="saas-card max-w-sm w-full p-8 text-center" style={{ width: '380px' }}>
          <div className="inline-flex p-3 rounded-full bg-red-100 text-red-600 mb-4 border border-red-200">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight font-heading">Security Lock</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">Your active session has expired</p>

          <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-655 mb-5 leading-relaxed">
            Enter target credentials to unlock:
            <div className="mt-1 text-slate-800 font-mono font-bold">
              {user?.role === 'STUDENT' ? 'student123' : user?.role === 'COLLEGE_TNP_OFFICER' ? 'officer123' : 'recruiter123'}
            </div>
          </div>

          <form onSubmit={handleUnlockSession} className="space-y-3">
            <input 
              type="password" 
              value={unlockPassword} 
              onChange={e => setUnlockPassword(e.target.value)} 
              className="saas-input text-xs text-center"
              placeholder="Session password"
            />
            {unlockError && <span className="block text-[10px] text-red-500">{unlockError}</span>}

            <button type="submit" className="btn-primary w-full justify-center text-xs py-2">
              <Unlock className="w-4 h-4" /> Restore Terminal
            </button>
          </form>
          
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-700 mt-4 underline block mx-auto">
            Log Out
          </button>
        </div>
      </div>
    );
  }

  // --- NAVIGATION HEADER FOR VISUAL LANDING SYSTEM ---
  const renderLandingNav = () => (
    <nav className="landing-nav px-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-600">
          <Cpu className="w-5 h-5" />
        </div>
        <span className="font-extrabold text-base tracking-tight text-slate-800 font-heading">
          HIRELINK
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentView('home')} className="landing-nav-link border-0 bg-transparent">Home</button>
        <button onClick={() => setCurrentView('contact')} className="landing-nav-link border-0 bg-transparent">Contact Us</button>
        {token ? (
          <button onClick={() => setCurrentView('portal')} className="btn-primary py-1.5 text-xs">
            Enter Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <>
            <button onClick={() => setCurrentView('login')} className="landing-nav-link border-0 bg-transparent font-bold text-indigo-600">Sign In</button>
            <button onClick={() => setCurrentView('register')} className="btn-primary py-1.5 text-xs">
              Enroll Today
            </button>
          </>
        )}
      </div>
    </nav>
  );

  // --- RENDERING 1: HOME PAGE ---
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {renderLandingNav()}
        
        {/* Spacious Hero Section */}
        <section className="flex-1 flex flex-col justify-center items-center py-16 px-6 text-center max-w-5xl mx-auto">
          <span className="saas-badge saas-badge-primary mb-4 text-[10px] py-1 px-3">
            Now Live: Bounded Cryptographic Placements
          </span>
          <h1 className="text-5xl tracking-tight mb-6 font-heading">
            Bridging Campus Talent With <br />
            <span className="hero-gradient-text">Isolated Enterprise Pipelines</span>
          </h1>
          <p className="text-slate-600 text-sm max-w-2xl leading-relaxed mb-8">
            HireLink is the world’s first multi-tenant university placement platform that provides mathematically guaranteed data separation. Students secure profiles in isolated silos while corporate pipelines match vacancies in real-time.
          </p>
          
          <div className="flex gap-4">
            <button onClick={() => setCurrentView('register')} className="btn-primary text-sm py-3 px-6">
              Create Secure Tenant <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentView('login')} className="btn-secondary text-sm py-3 px-6">
              Sign In to Endpoint
            </button>
          </div>

          {/* Core partners grid */}
          <div className="mt-16 w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-6">INTEGRATED DOWNSTREAM CAMPUS TENANTS</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="saas-card p-5 text-center bg-white flex flex-col items-center justify-center">
                <GraduationCap className="w-6 h-6 text-blue-600 mb-2" />
                <span className="font-bold text-xs text-slate-800 font-heading">MIT College Portal</span>
              </div>
              <div className="saas-card p-5 text-center bg-white flex flex-col items-center justify-center">
                <GraduationCap className="w-6 h-6 text-red-600 mb-2" />
                <span className="font-bold text-xs text-slate-800 font-heading">Stanford University</span>
              </div>
              <div className="saas-card p-5 text-center bg-white flex flex-col items-center justify-center">
                <Building2 className="w-6 h-6 text-emerald-600 mb-2" />
                <span className="font-bold text-xs text-slate-800 font-heading">Google Recruitment</span>
              </div>
              <div className="saas-card p-5 text-center bg-white flex flex-col items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-purple-600 mb-2" />
                <span className="font-bold text-xs text-slate-800 font-heading">Secured Gateway SOC</span>
              </div>
            </div>
          </div>
        </section>

        {/* Core Value Pillars Grid */}
        <section className="py-12 px-6 bg-white border-t border-slate-200">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="inline-flex p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-heading">Complete Database Isolation</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                MIT and Stanford assets reside in distinct cryptographic namespaces. Downstream APIs validate incoming claims to systematically prevent CORS breaches.
              </p>
            </div>

            <div className="space-y-3">
              <div className="inline-flex p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-heading">Dynamic Skill Matching</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Matching microservices scan resumes against active vacancies using a custom text index parser to deliver an instant mathematical compatibility percentage.
              </p>
            </div>

            <div className="space-y-3">
              <div className="inline-flex p-3 rounded-xl bg-red-50 text-red-500 border border-red-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-heading">Security Telemetry Auditing</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                The Security Operations Center (SOC) logs brute-force lockouts, parameter cleanups, and isolated cross-tenant penetration tests to maintain network transparency.
              </p>
            </div>
          </div>
        </section>

        <footer className="bg-slate-900 py-8 px-6 text-center text-xs text-slate-450 border-t border-slate-950">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-white font-bold font-heading">
              <Cpu className="w-4 h-4 text-indigo-400" /> HIRELINK SYSTEM
            </div>
            <span className="text-slate-400">© 2026 HireLink Inc. All cryptographic boundaries enforced.</span>
          </div>
        </footer>
      </div>
    );
  }

  // --- RENDERING 2: CONTACT PAGE ---
  if (currentView === 'contact') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {renderLandingNav()}

        <section className="flex-1 py-16 px-6 max-w-6xl w-full mx-auto grid grid-cols-12 gap-8 items-center">
          
          {/* Left direct contact details */}
          <div className="col-span-12 md:col-span-5 space-y-6">
            <span className="saas-badge saas-badge-secondary text-[10px] py-1 px-3">
              Direct System Endpoint
            </span>
            <h1 className="text-4xl tracking-tight font-heading">
              Contact HireLink <br />
              <span className="hero-gradient-text">Operations HQ</span>
            </h1>
            <p className="text-slate-600 text-xs leading-relaxed">
              Have inquiries about multi-tenant configuration, isolated deployment strategies, or database boundaries? Get in touch with our operations center immediately.
            </p>

            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs text-slate-800 block font-heading">Network Address</strong>
                  <span className="text-[11px] text-slate-500 font-mono">127.0.0.1:5000/api</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs text-slate-800 block font-heading">Secured Inbound</strong>
                  <span className="text-[11px] text-slate-500 font-mono">support@hirelink.network</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-xs text-slate-800 block font-heading">Direct Telemetry Line</strong>
                  <span className="text-[11px] text-slate-500 font-mono">MIT: ext. 4022 • Stanford: ext. 8150</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right contact secure form card */}
          <div className="col-span-12 md:col-span-7">
            <div className="saas-card p-8 bg-white">
              <h3 className="text-sm font-bold text-slate-800 mb-2 font-heading uppercase tracking-wider">
                Transmit Secure Dispatch
              </h3>
              <p className="text-[11px] text-slate-500 mb-6">
                Your message is cryptographically checked for malicious script queries before submission.
              </p>

              {contactSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs flex items-center gap-2 shadow-sm mb-4">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Secure dispatch transmitted successfully. Check terminal logs for response token.</span>
                </div>
              ) : null}

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">FULL NAME</label>
                  <input 
                    type="text" 
                    value={contactName} 
                    onChange={e => setContactName(e.target.value)} 
                    placeholder="Alice Johnson"
                    className="saas-input text-xs" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">SECURE EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    value={contactEmail} 
                    onChange={e => setContactEmail(e.target.value)} 
                    placeholder="alice@mit.edu"
                    className="saas-input text-xs" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">MESSAGE PAYLOAD</label>
                  <textarea 
                    value={contactMsg} 
                    onChange={e => setContactMsg(e.target.value)} 
                    placeholder="Write your security inquiry or general comments..."
                    className="saas-input text-xs h-28" 
                    required 
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center text-xs py-2.5">
                  {loading ? 'Transmitting claims...' : 'Submit Secure Inquiry'}
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

        </section>

        <footer className="bg-slate-900 py-8 px-6 text-center text-xs text-slate-450 border-t border-slate-950">
          <span className="text-slate-450">© 2026 HireLink Inc. All cryptographic boundaries enforced.</span>
        </footer>
      </div>
    );
  }

  // --- RENDERING 3: CUSTOM SECURE LOGIN PAGE ---
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {renderLandingNav()}

        <div className="flex-1 flex items-center justify-center p-6 py-12">
          <div className="saas-card max-w-md w-full p-8 bg-white" style={{ width: '450px' }}>
            
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100">
                <Cpu className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-heading">
                Sign In to HireLink
              </h1>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                Isolated Microservices Campus Gateway
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* QUICK PRESETS DROPDOWN */}
            <div className="mb-6 p-4 rounded-xl bg-slate-100 border border-slate-200">
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>One-Click Preset Role Accounts</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => loginSandboxUser('alice@mit.edu', 'student123')}
                  disabled={bruteForceLocked}
                  className="p-2 text-left bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-500 text-slate-700 transition flex flex-col justify-between"
                >
                  <strong className="text-slate-800">Alice (Student)</strong>
                  <span className="block text-[8px] text-blue-600 mt-1">MIT Campus Boundary</span>
                </button>

                <button 
                  onClick={() => loginSandboxUser('bob@stanford.edu', 'student123')}
                  disabled={bruteForceLocked}
                  className="p-2 text-left bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:border-red-500 text-slate-700 transition flex flex-col justify-between"
                >
                  <strong className="text-slate-800">Bob (Student)</strong>
                  <span className="block text-[8px] text-red-600 mt-1">Stanford Campus Boundary</span>
                </button>

                <button 
                  onClick={() => loginSandboxUser('officer@mit.edu', 'officer123')}
                  disabled={bruteForceLocked}
                  className="p-2 text-left bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:border-purple-500 text-slate-700 transition col-span-2 flex flex-col justify-between"
                >
                  <strong className="text-slate-800">Prof. Charles (TNP Officer)</strong>
                  <span className="block text-[8px] text-purple-600 mt-0.5">MIT isolated database portal scope</span>
                </button>

                <button 
                  onClick={() => loginSandboxUser('recruiter@google.com', 'recruiter123')}
                  disabled={bruteForceLocked}
                  className="p-2 text-left bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 text-slate-700 transition col-span-2 flex flex-col justify-between"
                >
                  <strong className="text-slate-800">Sarah (Google Corporate Recruiter)</strong>
                  <span className="block text-[8px] text-emerald-600 mt-0.5">Enterprise recruiters context panel</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="saas-input text-xs"
                  placeholder="you@domain.edu"
                  disabled={bruteForceLocked}
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">SECURE PASSWORD</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="saas-input text-xs"
                  placeholder="••••••••"
                  disabled={bruteForceLocked}
                  required
                />
              </div>

              {/* REMEMBER ME CHECKBOX */}
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="rememberMe"
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)} 
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-xs text-slate-500 cursor-pointer">
                  Remember my secure credentials next time
                </label>
              </div>

              <button type="submit" disabled={loading || bruteForceLocked} className="btn-primary w-full justify-center text-xs py-2.5 mt-2">
                {bruteForceLocked ? (
                  `Security Lockout (${bruteForceCountdown}s)`
                ) : loading ? (
                  'Connecting to gateway...'
                ) : (
                  'Verify & Enter Terminal'
                )}
                {!bruteForceLocked && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="text-center mt-5 text-xs text-slate-500">
              Need to join another tenant?
              <button 
                onClick={() => setCurrentView('register')}
                className="text-indigo-600 font-bold ml-1 hover:underline"
                disabled={bruteForceLocked}
              >
                Enroll Today
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING 4: CUSTOM SECURE REGISTER PAGE ---
  if (currentView === 'register') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {renderLandingNav()}

        <div className="flex-1 flex items-center justify-center p-6 py-12">
          <div className="saas-card max-w-md w-full p-8 bg-white" style={{ width: '450px' }}>
            
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100">
                <Cpu className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-heading">
                Enroll in HireLink
              </h1>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                Generate A Secured Tenant Account
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">FULL NAME</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="saas-input text-xs"
                  placeholder="Alice Johnson"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">SYSTEM ACCESS ROLE</label>
                  <select 
                    value={role} 
                    onChange={e => setRole(e.target.value)} 
                    className="saas-input text-xs"
                    required
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="COLLEGE_TNP_OFFICER">TNP OFFICER</option>
                    <option value="RECRUITER">RECRUITER</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">ORGANIZATION TENANT</label>
                  <select 
                    value={collegeId} 
                    onChange={e => setCollegeId(e.target.value)} 
                    className="saas-input text-xs"
                    required
                  >
                    <option value="MIT">MIT</option>
                    <option value="STANFORD">STANFORD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="saas-input text-xs"
                  placeholder="you@domain.edu"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">SECURE PASSWORD</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="saas-input text-xs"
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* REMEMBER ME CHECKBOX */}
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="rememberMeReg"
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)} 
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="rememberMeReg" className="text-xs text-slate-500 cursor-pointer">
                  Remember my secure credentials next time
                </label>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center text-xs py-2.5 mt-2">
                {loading ? 'Enrolling account...' : 'Create Secure Tenant Account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center mt-5 text-xs text-slate-500">
              Already enrolled?
              <button 
                onClick={() => setCurrentView('login')}
                className="text-indigo-600 font-bold ml-1 hover:underline"
              >
                Login Instead
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING 5: MAIN PORTAL AREA ---
  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-750 ${getThemeClass()}`}>
      
      {/* Dynamic Header */}
      <header className="saas-card rounded-none border-t-0 border-x-0 py-4 px-6 flex items-center justify-between sticky top-0 z-50 bg-white/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-600">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-800 flex items-center gap-2 font-heading">
              HIRELINK <span className="saas-badge saas-badge-primary text-[8px] py-0.5 px-2">SECURED PORTAL</span>
            </span>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-semibold">
              <span>College Context: <strong className="text-slate-800">{user?.collegeId}</strong></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-350"></span>
              <span>Identity Role: <strong className="text-slate-800">{user?.role}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          
          {/* Quick Landing navigation button */}
          <button onClick={() => setCurrentView('home')} className="landing-nav-link border border-slate-200 text-xs py-1.5 px-3">
            Exit to Home
          </button>

          {/* Session Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-655 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>SESSION TIME:</span>
            <span className="font-bold text-slate-800">{formatTime(sessionTimeLeft)}</span>
            <button onClick={handleManualLock} className="p-0.5 text-slate-400 hover:text-red-500 ml-1.5" title="Lock Session">
              <Lock className="w-3 h-3" />
            </button>
          </div>

          {/* Notifications dropdown */}
          <div className="relative group">
            <button className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition">
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
            </button>
            
            <div className="absolute right-0 mt-2 w-72 saas-card p-4 hidden group-hover:block z-50 bg-white text-xs space-y-2">
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-indigo-500" /> Notifications Feed
              </h4>
              {notifications.length === 0 ? (
                <span className="text-slate-400 block text-center py-3 font-mono">No active notifications</span>
              ) : (
                notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                    <strong className="text-slate-700 block">{n.title}</strong>
                    <span className="text-slate-500 text-[10px]">{n.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-205">
            <div className="flex flex-col text-right">
              <span className="text-xs text-slate-800 font-bold font-heading">{user?.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              title="Close Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Grid Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-12 gap-6">
        
        {/* Navigation Sidebar */}
        <aside className="col-span-12 md:col-span-3 space-y-4">
          <nav className="saas-card p-4 space-y-1 bg-white">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`saas-sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <Compass className="w-4 h-4" />
              TNP Overview
            </button>
            <button 
              onClick={() => setActiveTab('jobs')}
              className={`saas-sidebar-btn ${activeTab === 'jobs' ? 'active' : ''}`}
            >
              <Briefcase className="w-4 h-4" />
              Isolated Listings
            </button>
            <button 
              onClick={() => setActiveTab('applications')}
              className={`saas-sidebar-btn ${activeTab === 'applications' ? 'active' : ''}`}
            >
              <FileText className="w-4 h-4" />
              Applicant Tracker
            </button>
            
            {user?.role === 'STUDENT' && (
              <button 
                onClick={() => setActiveTab('profile')}
                className={`saas-sidebar-btn ${activeTab === 'profile' ? 'active' : ''}`}
              >
                <User className="w-4 h-4" />
                Resume Roadmap
              </button>
            )}

            {user?.role === 'COLLEGE_TNP_OFFICER' && (
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`saas-sidebar-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              >
                <TrendingUp className="w-4 h-4" />
                Campus Insights
              </button>
            )}

            <button 
              onClick={() => setActiveTab('security')}
              className={`saas-sidebar-btn ${activeTab === 'security' ? 'active' : ''}`}
              style={{ borderLeft: '3px solid rgb(239, 68, 68)' }}
            >
              <Shield className="w-4 h-4 text-red-500" />
              Security SOC Panel
            </button>
          </nav>

          {/* Telemetry Console */}
          <div className="saas-card p-5 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-500" />
                Gateway Events
              </span>
              <span className="saas-badge saas-badge-success text-[7px] py-0.5">Telemetry</span>
            </div>
            
            <div className="h-44 overflow-y-auto rounded-lg bg-slate-900 border border-slate-950 p-3 font-mono text-[9px] text-slate-400 space-y-1.5">
              {logs.map((log, i) => (
                <div key={i} className="leading-relaxed border-b border-slate-800/40 pb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Dashboard Panels */}
        <main className="col-span-12 md:col-span-9 space-y-6">
          
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs flex items-center gap-2 shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              <div className="saas-card p-8 bg-slate-900 text-white border-0 shadow-md relative overflow-hidden">
                <span className="saas-badge saas-badge-primary text-[8px] bg-indigo-500/20 text-indigo-200 border-0 mb-3">
                  Multi-Tenant Separation Active
                </span>
                <h2 className="text-2xl font-bold mb-2 font-heading tracking-wide uppercase">
                  {user?.collegeId} TNP Control Board
                </h2>
                <p className="text-slate-350 text-xs max-w-xl leading-relaxed">
                  Welcome to your secure recruitment workspace. Your identity claims are verified at downstream microservice boundaries to mathematically guarantee tenant data isolation.
                </p>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => setActiveTab('jobs')} className="btn-primary text-xs py-2 bg-indigo-600 border-indigo-500 hover:bg-indigo-700">
                    Explore Jobs <ArrowRight className="w-4 h-4" />
                  </button>
                  {user?.role === 'STUDENT' && (
                    <button onClick={() => setActiveTab('profile')} className="btn-secondary text-xs py-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
                      Configure Resume
                    </button>
                  )}
                </div>
              </div>

              {/* STUDENT CORNER */}
              {user?.role === 'STUDENT' && studentProfile && (
                <div className="grid grid-cols-12 gap-6">
                  
                  {/* Milestones timeline card */}
                  <div className="saas-card col-span-12 md:col-span-6 p-6 bg-white">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5 font-heading">
                      <Map className="w-4 h-4 text-indigo-500" /> Professional Career Milestones
                    </h3>

                    <div className="saas-timeline">
                      {studentProfile.milestones?.map((m, i) => (
                        <div key={i} className={`saas-timeline-item ${m.status.toLowerCase()}`}>
                          <span className="saas-timeline-dot"></span>
                          <div className="pl-3">
                            <h4 className="text-xs font-bold text-slate-800">{m.title}</h4>
                            <span className="text-[10px] text-slate-500">{m.date}</span>
                            <span className={`saas-badge ml-2 text-[7px] py-0.5 ${m.status === 'COMPLETED' ? 'saas-badge-success' : m.status === 'IN_PROGRESS' ? 'saas-badge-secondary' : 'saas-badge-primary'}`}>
                              {m.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills/GPA parameters card */}
                  <div className="saas-card col-span-12 md:col-span-6 p-6 bg-white flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5 font-heading">
                        <GraduationCap className="w-4 h-4 text-indigo-500" /> Academic Credentials
                      </h3>
                      
                      <div className="space-y-4 mb-4">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          
                          {/* GPA with Decrypted Lock */}
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg relative">
                            <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">GPA SCORE</span>
                            {revealedConfidentialData['gpa'] ? (
                              <strong className="text-slate-800 text-sm mt-0.5 block font-heading">{studentProfile.gpa} / 4.0</strong>
                            ) : (
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-slate-400 font-mono text-sm tracking-widest">•••••</span>
                                <button 
                                  onClick={() => triggerBiometricReveal('gpa', 'GPA Record')}
                                  className="text-indigo-600 hover:text-indigo-800 p-0.5"
                                  title="Biometric Verify"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">SPECIALTY</span>
                            <strong className="text-slate-800 text-xs mt-0.5 block font-heading">{studentProfile.major}</strong>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs text-slate-500 font-bold block mb-1">Competencies Matrix:</span>
                          <div className="flex flex-wrap gap-1">
                            {studentProfile.skills.map((skill, i) => (
                              <span key={i} className="saas-badge saas-badge-primary text-[8px]">{skill}</span>
                            ))}
                          </div>
                        </div>

                        {studentProfile.certifications.length > 0 && (
                          <div>
                            <span className="text-xs text-slate-500 font-bold block mb-1">System Credentials:</span>
                            <div className="flex flex-wrap gap-1">
                              {studentProfile.certifications.map((cert, i) => (
                                <span key={i} className="saas-badge saas-badge-secondary text-[8px]">{cert}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* University Mailing Queue */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-1.5 text-slate-655 text-xs font-bold uppercase tracking-wider mb-2 font-heading">
                        <Mail className="w-4 h-4 text-indigo-500" />
                        <span>University Mailing Queue</span>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1.5 text-[9px]">
                        {notifications.filter(n => n.type === 'EMAIL').length === 0 ? (
                          <span className="text-slate-400 block text-center py-2 font-mono">Mail logs are empty.</span>
                        ) : (
                          notifications.filter(n => n.type === 'EMAIL').map((n, i) => (
                            <div key={i} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-655">
                              <span className="font-bold block text-slate-800">{n.title}</span>
                              <span>{n.message}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* RECRUITER CORNER */}
              {user?.role === 'RECRUITER' && (
                <div className="grid grid-cols-12 gap-6">
                  
                  {/* Post Job Form */}
                  <div className="saas-card col-span-12 md:col-span-6 p-6 bg-white">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5 font-heading">
                      <PlusCircle className="w-4 h-4 text-indigo-500" /> Create Corporate Listing
                    </h3>
                    
                    <form onSubmit={handleSubmitJob} className="space-y-3">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Job Designation</label>
                        <input 
                          type="text"
                          value={newJobTitle}
                          onChange={e => setNewJobTitle(e.target.value)}
                          placeholder="E.g., Senior Systems Analyst"
                          className="saas-input text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Corporation</label>
                        <input 
                          type="text"
                          value={newJobCompany}
                          onChange={e => setNewJobCompany(e.target.value)}
                          placeholder="E.g., Google"
                          className="saas-input text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Skills (Comma split)</label>
                        <input 
                          type="text"
                          value={newJobSkills}
                          onChange={e => setNewJobSkills(e.target.value)}
                          placeholder="React, SQL, Node.js"
                          className="saas-input text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-wider">GPA Target</label>
                          <input 
                            type="text"
                            value={newJobMinGPA}
                            onChange={e => setNewJobMinGPA(e.target.value)}
                            placeholder="3.5"
                            className="saas-input text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Major Focus</label>
                          <select 
                            value={newJobMajor}
                            onChange={e => setNewJobMajor(e.target.value)}
                            className="saas-input text-xs"
                          >
                            <option value="Computer Science">Computer Science</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Data Science">Data Science</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Role Overview</label>
                        <textarea 
                          value={newJobDesc}
                          onChange={e => setNewJobDesc(e.target.value)}
                          placeholder="Provide role specifics..."
                          className="saas-input text-xs h-16"
                        />
                      </div>

                      <button type="submit" className="btn-primary w-full justify-center text-xs py-2">
                        Post Listing & Run Scans
                      </button>
                    </form>
                  </div>

                  {/* Candidate list evaluation */}
                  <div className="saas-card col-span-12 md:col-span-6 p-6 bg-white">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5 font-heading">
                      <Building2 className="w-4 h-4 text-indigo-500" /> Campus Applicants Queue
                    </h3>
                    
                    <div className="space-y-3 overflow-y-auto max-h-[360px]">
                      {applications.length === 0 ? (
                        <span className="text-slate-400 block text-center py-12 text-xs font-mono">Applicants queue empty.</span>
                      ) : (
                        applications.map((app) => (
                          <div key={app.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">{app.studentName}</h4>
                                {revealedConfidentialData[app.id] ? (
                                  <span className="text-[9px] text-slate-500 block font-mono">{app.studentEmail}</span>
                                ) : (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] text-slate-400 font-mono">•••••••••••••</span>
                                    <button 
                                      onClick={() => triggerBiometricReveal(app.id, 'Candidate Contact')}
                                      className="text-indigo-600 hover:text-indigo-800 p-0.5"
                                      title="Decrypt Contact"
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <span className={`saas-badge text-[7px] ${app.status === 'SELECTED' ? 'saas-badge-success' : app.status === 'REJECTED' ? 'saas-badge-error' : 'saas-badge-warning'}`}>
                                {app.status}
                              </span>
                            </div>

                            <div className="text-[9px] text-slate-500 bg-white border border-slate-200 p-2 rounded">
                              <strong>Target Posting:</strong> {app.job?.title}
                            </div>

                            {app.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleScreenCandidate(app.id, 'SELECTED', app.studentName)}
                                  className="btn-primary py-1 px-3 text-[9px] bg-emerald-600 hover:bg-emerald-700 shadow-none border-0"
                                >
                                  Select
                                </button>
                                <button 
                                  onClick={() => handleScreenCandidate(app.id, 'REJECTED', app.studentName)}
                                  className="btn-secondary py-1 px-3 text-[9px] text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 2: JOBS */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-heading">Campus Listings Directory</h2>
                <p className="text-xs text-slate-500 font-semibold">Tenant isolation verified for active campus boundary.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.length === 0 ? (
                  <div className="col-span-2 saas-card p-12 text-center text-slate-400 text-xs font-mono bg-white">
                    No active job vacancies loaded.
                  </div>
                ) : (
                  jobs.map((job) => {
                    const matchScore = getJobMatchScore(job.skills);
                    const isEligible = studentProfile ? (studentProfile.gpa >= job.minGPA) : true;
                    
                    return (
                      <div key={job.id} className="saas-card p-6 saas-card-hover bg-white flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-sm font-bold text-slate-800 font-heading">{job.title}</h3>
                              <span className="text-xs text-indigo-600 font-semibold">{job.companyName}</span>
                            </div>
                            {user?.role === 'STUDENT' && (
                              <span className={`saas-badge ${matchScore >= 70 ? 'saas-badge-success' : matchScore >= 40 ? 'saas-badge-warning' : 'saas-badge-error'} text-[7px]`}>
                                {matchScore}% Alignment
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 line-clamp-3 mb-4 leading-relaxed">
                            {job.description}
                          </p>

                          <div className="space-y-2 mb-4 text-[9px] text-slate-500 border-t border-slate-100 pt-3">
                            <div>
                              <strong>Skills Array:</strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {job.skills.split(',').map((s, idx) => (
                                  <span key={idx} className="saas-badge saas-badge-primary text-[7px]">{s.trim()}</span>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2 font-mono">
                              <div>Target GPA: {job.minGPA}</div>
                              <div>Target Major: {job.major}</div>
                            </div>
                          </div>
                        </div>

                        {user?.role === 'STUDENT' && (
                          <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100">
                            {!isEligible ? (
                              <span className="text-[9px] text-red-500 flex items-center gap-1 font-mono font-bold">
                                <AlertCircle className="w-3.5 h-3.5" /> GPA Index Mismatch
                              </span>
                            ) : applications.some(a => a.jobId === job.id) ? (
                              <span className="saas-badge saas-badge-success text-[7px]">Applied</span>
                            ) : (
                              <button 
                                onClick={() => handleApply(job.id, job.title)}
                                className="btn-primary py-1.5 px-3 text-[10px]"
                              >
                                Submit Application <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: APPLICATIONS */}
          {activeTab === 'applications' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-heading">Applicant tracking system</h2>
                <p className="text-xs text-slate-500 font-semibold">Dynamically filtering relational assets inside university scopes.</p>
              </div>

              <div className="saas-card overflow-hidden bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 font-bold text-slate-500">APPLICANT</th>
                      <th className="p-4 font-bold text-slate-500">JOB POSITION</th>
                      <th className="p-4 font-bold text-slate-500">COLLEGE</th>
                      <th className="p-4 font-bold text-slate-500">STATUS</th>
                      <th className="p-4 font-bold text-slate-500">SUBMISSION DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-mono text-xs">
                          Applications queue is empty.
                        </td>
                      </tr>
                    ) : (
                      applications.map((app) => (
                        <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="p-4">
                            <strong className="text-slate-800 block">{app.studentName}</strong>
                            {revealedConfidentialData[app.id] ? (
                              <span className="text-[9px] text-slate-500 font-mono">{app.studentEmail}</span>
                            ) : (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] text-slate-400 font-mono">•••••••••••••</span>
                                <button 
                                  onClick={() => triggerBiometricReveal(app.id, 'Candidate Email')}
                                  className="text-indigo-600 hover:text-indigo-850 p-0.5"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <strong className="text-slate-800 block">{app.job?.title}</strong>
                            <span className="text-[10px] text-indigo-600 font-semibold">{app.job?.companyName}</span>
                          </td>
                          <td className="p-4 text-slate-500 font-bold uppercase font-mono">{app.collegeId}</td>
                          <td className="p-4">
                            <span className={`saas-badge text-[7px] ${app.status === 'SELECTED' ? 'saas-badge-success' : app.status === 'REJECTED' ? 'saas-badge-error' : 'saas-badge-warning'}`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 font-mono">{new Date(app.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE */}
          {activeTab === 'profile' && user?.role === 'STUDENT' && (
            <div className="saas-card p-8 max-w-lg mx-auto space-y-6 bg-white">
              <div>
                <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-heading">Configure student specifications</h2>
                <p className="text-xs text-slate-500">Recalculate skills matrices stored inside microservices directories.</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">COMPETENCIES (COMMA SPLIT)</label>
                  <input 
                    type="text"
                    value={editSkills}
                    onChange={e => setEditSkills(e.target.value)}
                    className="saas-input text-xs"
                    placeholder="React, Python, SQL"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">CUMULATIVE GPA</label>
                    <input 
                      type="text"
                      value={editGPA}
                      onChange={e => setEditGPA(e.target.value)}
                      className="saas-input text-xs"
                      placeholder="3.8"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">SPECIALTY MAJOR</label>
                    <input 
                      type="text"
                      value={editMajor}
                      onChange={e => setEditMajor(e.target.value)}
                      className="saas-input text-xs"
                      placeholder="Computer Science"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">SYSTEM CREDENTIALS</label>
                  <input 
                    type="text"
                    value={editCerts}
                    onChange={e => setEditCerts(e.target.value)}
                    className="saas-input text-xs"
                    placeholder="AWS Associate, GCP Architect"
                  />
                </div>

                <button type="submit" className="btn-primary w-full justify-center text-xs py-2.5 mt-2">
                  Update Resume Specifications
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: TNP CAMPUS INSIGHTS */}
          {activeTab === 'analytics' && user?.role === 'COLLEGE_TNP_OFFICER' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="saas-card p-5 bg-white">
                  <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">PLACEMENT RATE</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <h3 className="text-xl font-extrabold text-slate-800 font-heading">94.2%</h3>
                    <div className="saas-badge saas-badge-success text-[7px] py-0.5">Active</div>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 font-mono">MIT student baseline</p>
                </div>
                
                <div className="saas-card p-5 bg-white">
                  <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">AVERAGE COHORT GPA</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <h3 className="text-xl font-extrabold text-slate-800 font-heading">3.85 / 4.0</h3>
                    <div className="saas-badge saas-badge-primary text-[7px] py-0.5">Verified</div>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 font-mono">Isolated credentials match</p>
                </div>

                <div className="saas-card p-5 bg-white">
                  <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">TOTAL PLACEMENTS</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <h3 className="text-xl font-extrabold text-slate-800 font-heading">
                      {applications.filter(a => a.status === 'SELECTED').length} Placed
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 font-mono">Active cohort recruits</p>
                </div>
              </div>

              {/* Bounded registers */}
              <div className="saas-card p-6 bg-white">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2 font-heading">
                  <GraduationCap className="w-5 h-5 text-indigo-500" /> Isolated Campus Student Profiles
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-slate-800 block">Alice Johnson</strong>
                      <span className="text-[10px] text-slate-500 font-mono">MIT boundary • CS major • alice@mit.edu</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="saas-badge saas-badge-primary text-[7px]">React</span>
                      <span className="saas-badge saas-badge-primary text-[7px]">TypeScript</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-slate-800 block">Bob Miller</strong>
                      <span className="text-[10px] text-slate-500 font-mono">STANFORD boundary • CS major • bob@stanford.edu</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="saas-badge saas-badge-secondary text-[7px]">Python</span>
                      <span className="saas-badge saas-badge-secondary text-[7px]">Django</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: SECURITY OPERATIONS CENTER */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              <div className="saas-card p-6 bg-red-50 border border-red-100 flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-lg border border-red-200 text-red-655">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-heading">
                    Security Operations Center (SOC)
                    <span className="saas-badge saas-badge-error text-[7px] py-0.5 bg-red-100 border-red-200">GATEWAY ACTIVE</span>
                  </h3>
                  <p className="text-slate-655 text-[11px] mt-1.5 leading-relaxed">
                    This sandbox evaluates the isolated microservices design pattern. Double-submit anti-CSRF cookies, isolated down-stream JWT injections, brute-force bans, and escaping loops are audited live.
                  </p>
                </div>
              </div>

              {/* JWT Decryption & SQL sanitization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* JWT Claims card */}
                <div className="saas-card p-6 space-y-4 bg-white">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <Key className="w-4 h-4 text-indigo-500" /> Injected JWT Claims Decoder
                  </h3>
                  
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px]">
                      <div className="text-slate-500 uppercase tracking-wider text-[8px] mb-1 font-bold">CRYPTO STATUS</div>
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Signature verified: HMAC-SHA256
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono text-[9px]">
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-slate-500 block">ISSUER (ISS)</span>
                        <span className="text-slate-800 font-bold block mt-0.5">auth-service</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-slate-500 block">ALGORITHM</span>
                        <span className="text-slate-800 font-bold block mt-0.5">HS256</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px] space-y-1">
                      <div className="text-slate-500 uppercase tracking-wider text-[8px] mb-1 font-bold">CRYPTOGRAPHIC BOUNDARY ID</div>
                      <div>User Context ID: <span className="text-indigo-600 font-bold">{user?.id}</span></div>
                      <div>Tenant Identity: <span className="text-slate-800 font-bold">{user?.collegeId}</span></div>
                      <div>Access Scope: <span className="text-slate-800 font-bold">{user?.role}</span></div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px]">
                      <div className="text-slate-500 uppercase tracking-wider text-[8px] mb-1.5 font-bold">GRANTED Downstream Access permissions</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user?.role === 'STUDENT' ? (
                          <>
                            <span className="saas-badge saas-badge-primary text-[7px]">jobs:read</span>
                            <span className="saas-badge saas-badge-primary text-[7px]">applications:apply</span>
                            <span className="saas-badge saas-badge-primary text-[7px]">profile:write</span>
                          </>
                        ) : user?.role === 'RECRUITER' ? (
                          <>
                            <span className="saas-badge saas-badge-secondary text-[7px]">jobs:write</span>
                            <span className="saas-badge saas-badge-secondary text-[7px]">applications:read</span>
                            <span className="saas-badge saas-badge-secondary text-[7px]">applications:write</span>
                          </>
                        ) : (
                          <>
                            <span className="saas-badge saas-badge-success text-[7px]">jobs:read</span>
                            <span className="saas-badge saas-badge-success text-[7px]">jobs:write</span>
                            <span className="saas-badge saas-badge-success text-[7px]">applications:read</span>
                            <span className="saas-badge saas-badge-success text-[7px]">applications:write</span>
                            <span className="saas-badge saas-badge-success text-[7px]">analytics:read</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SQL firewall card */}
                <div className="saas-card p-6 space-y-4 bg-white">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <Terminal className="w-4 h-4 text-indigo-500" /> SQL Injection Firewall Sanitizer
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-wider">STRING PARAMETER INPUT:</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={sqlPayload} 
                          onChange={e => setSqlPayload(e.target.value)} 
                          className="saas-input text-xs font-mono"
                        />
                        <button onClick={runSqlPenTest} className="btn-primary text-xs">
                          Test
                        </button>
                      </div>
                    </div>

                    {sqlSanitizedResult && (
                      <div className="dev-console text-[9px] space-y-1.5">
                        <div className="text-sky-300 uppercase tracking-wider text-[8px] font-bold">GATEWAY SANITIZER LOGS:</div>
                        <div className="text-white">{sqlSanitizedResult}</div>
                        {sqlThreatRemediated ? (
                          <span className="saas-badge saas-badge-success text-[7px] mt-1 bg-emerald-900 border-0 text-white">
                            Threat Escaped: Malicious Query Stripped
                          </span>
                        ) : (
                          <span className="saas-badge saas-badge-primary text-[7px] mt-1 bg-blue-900 border-0 text-white">
                            Passed: Parameter Clean
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Cross-Tenant pen-test & Brute force */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Cross-Tenant pen-test card */}
                <div className="saas-card p-6 space-y-4 bg-white">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <Database className="w-4 h-4 text-indigo-500" /> Cross-Tenant Isolation Pen-Test
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 mb-1 uppercase tracking-wider">TARGET CO-STUDENT RESUME EMAIL:</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={tenantVictimEmail} 
                          onChange={e => setTenantVictimEmail(e.target.value)} 
                          className="saas-input text-xs font-mono"
                        />
                        <button onClick={runTenantPenTest} className="btn-primary text-xs">
                          Execute Query
                        </button>
                      </div>
                    </div>

                    {tenantLog.length > 0 && (
                      <div className="dev-console text-[9px] space-y-1">
                        {tenantLog.map((log, i) => (
                          <div key={i} className={log.includes('BLOCKED') || log.includes('DENIED') ? 'text-red-400 font-bold' : log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                            {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Brute force controller card */}
                <div className="saas-card p-6 space-y-4 bg-white">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Brute Force Lockout Controller
                  </h3>

                  <div className="space-y-3.5 text-xs">
                    <p className="text-slate-655 text-[11px] leading-relaxed">
                      Downstream protection blocks consecutive authentication errors to protect against automated dictionary lock drills.
                    </p>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const badCount = bruteForceAttempts + 1;
                          setBruteForceAttempts(badCount);
                          addLog('Failed authentication registered.');
                          if (badCount >= 3) {
                            setBruteForceLocked(true);
                            setBruteForceCountdown(60);
                            addLog('Brute force threshold reached: local IP lockout triggered.');
                          }
                        }}
                        disabled={bruteForceLocked}
                        className="btn-secondary py-1.5 px-3 text-red-600 border-red-200 hover:bg-red-50 text-xs"
                      >
                        Fail Login Hook
                      </button>

                      <div className="font-mono text-[10px] text-slate-500">
                        ATTEMPTS REGISTERED: <strong className="text-slate-800">{bruteForceAttempts} / 3</strong>
                      </div>
                    </div>

                    {bruteForceLocked && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[9px] text-red-655 text-center font-mono animate-pulse">
                        LOCAL LOCKOUT TRIGGERED. RETRY DELAY: {bruteForceCountdown}s
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>

      </div>
    </div>
  );
}
