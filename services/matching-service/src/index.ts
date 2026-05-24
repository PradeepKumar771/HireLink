import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003;
const TNP_CORE_SERVICE_URL = process.env.TNP_CORE_SERVICE_URL || 'http://localhost:5002';

app.use(express.json());

// In-Memory Resume Profile Database (Mock MongoDB Document Store)
interface ResumeProfile {
  studentId: string;
  collegeId: string;
  studentName: string;
  studentEmail: string;
  skills: string[];
  gpa: number;
  major: string;
  certifications: string[];
  milestones: { title: string; date: string; status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' }[];
}

let profiles: ResumeProfile[] = [
  {
    studentId: 'ALICE_MIT_ID_PLACEHOLDER', // This will map dynamically, let's also resolve by email or name
    studentName: 'Alice Johnson',
    studentEmail: 'alice@mit.edu',
    collegeId: 'MIT',
    skills: ['React', 'TypeScript', 'Node.js', 'SQL', 'CSS', 'HTML'],
    gpa: 3.8,
    major: 'Computer Science',
    certifications: ['AWS Cloud Practitioner', 'Prisma Advanced Specialist'],
    milestones: [
      { title: 'TNP Profile Completed', date: '2026-05-10', status: 'COMPLETED' },
      { title: 'AWS Cloud Certification', date: '2026-05-15', status: 'COMPLETED' },
      { title: 'Resume Review Passed', date: '2026-05-20', status: 'COMPLETED' },
      { title: 'Core Skills Assessment', date: '2026-05-25', status: 'IN_PROGRESS' },
      { title: 'First Technical Interview', date: '2026-06-05', status: 'UPCOMING' }
    ]
  },
  {
    studentId: 'BOB_STANFORD_ID_PLACEHOLDER',
    studentName: 'Bob Miller',
    studentEmail: 'bob@stanford.edu',
    collegeId: 'STANFORD',
    skills: ['Python', 'Django', 'Machine Learning', 'TensorFlow', 'SQL'],
    gpa: 3.9,
    major: 'Computer Science',
    certifications: ['Google TensorFlow Developer'],
    milestones: [
      { title: 'TNP Profile Setup', date: '2026-05-12', status: 'COMPLETED' },
      { title: 'ML Project Milestone', date: '2026-05-18', status: 'COMPLETED' },
      { title: 'Technical Assessment', date: '2026-06-01', status: 'UPCOMING' }
    ]
  }
];

// Helper to calculate Skill Compatibility Index
const calculateScore = (studentSkills: string[], jobSkills: string[]): number => {
  if (jobSkills.length === 0) return 100;
  const matches = studentSkills.filter(skill => 
    jobSkills.some(js => js.toLowerCase() === skill.toLowerCase())
  );
  return Math.round((matches.length / jobSkills.length) * 100);
};

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'matching-service' });
});

// GET /profile/:studentId (Retrieve Student Career Profile & Milestones for Roadmap)
app.get('/profile/:studentId', (req, res) => {
  const { studentId } = req.params;
  const userEmail = req.headers['x-user-email'] as string;
  
  // Find by ID or fallback to sandbox emails for smooth local experience
  let profile = profiles.find(p => p.studentId === studentId);
  if (!profile && userEmail) {
    profile = profiles.find(p => p.studentEmail.toLowerCase() === userEmail.toLowerCase());
  }

  if (!profile) {
    return res.status(404).json({ success: false, message: 'Career Profile not found in matching engine.' });
  }

  return res.status(200).json({ success: true, profile });
});

// PUT /profile (Update skills / milestones)
app.put('/profile', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;
  const userCollegeId = req.headers['x-user-college-id'] as string;
  const userName = req.headers['x-user-name'] as string;
  const { skills, gpa, major, certifications, milestones } = req.body;

  let index = profiles.findIndex(p => p.studentEmail.toLowerCase() === userEmail.toLowerCase());
  
  const updatedProfile: ResumeProfile = {
    studentId: userId,
    studentName: userName || 'Sandbox Student',
    studentEmail: userEmail,
    collegeId: userCollegeId || 'MIT',
    skills: skills || [],
    gpa: gpa ? parseFloat(gpa) : 0.0,
    major: major || 'Any',
    certifications: certifications || [],
    milestones: milestones || [
      { title: 'TNP Profile Created', date: new Date().toISOString().split('T')[0], status: 'COMPLETED' }
    ]
  };

  if (index !== -1) {
    profiles[index] = updatedProfile;
  } else {
    profiles.push(updatedProfile);
  }

  return res.status(200).json({ success: true, message: 'Career Profile updated successfully.', profile: updatedProfile });
});

// POST /match-job (Woken up by TNP Core database write!)
app.post('/match-job', async (req, res) => {
  const { jobId, title, companyName, skills, minGPA, major, collegeId } = req.body;

  console.log(`[Matching Engine] Scanning candidates for job: "${title}" at ${companyName} (${collegeId})`);

  // 1. Strictly Filter candidates from the SAME college (Enforcing data isolation boundary)
  const eligibleCandidates = profiles.filter(p => p.collegeId.toUpperCase() === collegeId.toUpperCase());
  
  const matchesFound: any[] = [];

  for (const candidate of eligibleCandidates) {
    // 2. Perform Eligibility Filter Checks
    if (minGPA && candidate.gpa < minGPA) {
      console.log(`[Matching Engine] Student ${candidate.studentName} disqualified (GPA: ${candidate.gpa} < Min: ${minGPA})`);
      continue;
    }

    if (major && major.toLowerCase() !== 'any' && candidate.major.toLowerCase() !== major.toLowerCase()) {
      console.log(`[Matching Engine] Student ${candidate.studentName} disqualified (Major: ${candidate.major} !== Required: ${major})`);
      continue;
    }

    // 3. Compute dynamic weighted Compatibility Index
    const compatibilityScore = calculateScore(candidate.skills, skills);
    console.log(`[Matching Engine] Student ${candidate.studentName} scored ${compatibilityScore}% compatibility`);

    // Match criteria threshold (e.g. 50% match)
    if (compatibilityScore >= 50) {
      matchesFound.push({
        candidate,
        compatibilityScore
      });

      // 4. Trigger automated email dispatcher inside TNP Core Service
      try {
        await axios.post(`${TNP_CORE_SERVICE_URL}/notify-match`, {
          studentId: candidate.studentId,
          studentEmail: candidate.studentEmail,
          studentName: candidate.studentName,
          jobId,
          jobTitle: title,
          companyName,
          collegeId
        });
      } catch (err: any) {
        console.error(`[Matching Engine] Failed to dispatch match notification to Core for student ${candidate.studentName}:`, err.message);
      }
    }
  }

  return res.status(200).json({
    success: true,
    totalScanned: eligibleCandidates.length,
    matchesCount: matchesFound.length,
    matches: matchesFound.map(m => ({
      name: m.candidate.studentName,
      score: m.compatibilityScore
    }))
  });
});

// GET /analytics (Admin/TNP Officers placement metrics)
app.get('/analytics', (req, res) => {
  const collegeId = req.headers['x-user-college-id'] as string;

  const collegeStudents = profiles.filter(p => p.collegeId.toUpperCase() === (collegeId || 'MIT').toUpperCase());
  const totalStudents = collegeStudents.length;
  
  // Compute analytics metrics
  const avgGPA = totalStudents > 0 
    ? (collegeStudents.reduce((sum, p) => sum + p.gpa, 0) / totalStudents).toFixed(2)
    : 0;

  const topSkills: { [key: string]: number } = {};
  collegeStudents.forEach(p => {
    p.skills.forEach(skill => {
      topSkills[skill] = (topSkills[skill] || 0) + 1;
    });
  });

  const sortedSkills = Object.entries(topSkills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => ({ skill: entry[0], count: entry[1] }));

  return res.status(200).json({
    success: true,
    collegeId,
    totalStudents,
    averageGPA: parseFloat(avgGPA as string),
    topSkills: sortedSkills
  });
});

app.listen(PORT, () => {
  console.log(`[MatchingService] Running on port ${PORT}`);
});
