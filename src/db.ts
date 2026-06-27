import fs from 'fs';
import path from 'path';
import { User, Issue, Upvote, Verification, XpLog, IssueType, IssueStatus } from './types';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface Schema {
  users: User[];
  issues: Issue[];
  upvotes: Upvote[];
  verifications: Verification[];
  xp_logs: XpLog[];
}

const initialSchema: Schema = {
  users: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@communityhero.in',
      name: 'Demo Citizen',
      ward_number: 151,
      xp_points: 500,
      level: 'Guardian 🛡️',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Demo',
      created_at: new Date().toISOString()
    }
  ],
  issues: [],
  upvotes: [],
  verifications: [],
  xp_logs: []
};

// Ward centers for seeding and validation
const WARD_CENTERS = [
  { name: 'Koramangala', ward: 151, lat: 12.9352, lng: 77.6244, count: 15, addresses: [
    '80 Feet Rd, 4th Block, Koramangala',
    '100 Feet Rd, 5th Block, Koramangala',
    '1st Cross Rd, 3rd Block, Koramangala',
    'Jyoti Nivas College Rd, 5th Block, Koramangala',
    'Sarjapur Main Rd, Jakasandra, Koramangala',
    'Koramangala Club Rd, 6th Block, Koramangala',
    '8th Main Rd, 4th Block, Koramangala',
    'Koramangala Indoor Stadium Rd, 8th Block, Koramangala',
    '20th Main Rd, 1st Block, Koramangala',
    'Intermediate Ring Rd, Koramangala'
  ]},
  { name: 'Indiranagar', ward: 75, lat: 12.9719, lng: 77.6412, count: 12, addresses: [
    '100 Feet Rd, Indiranagar',
    '12th Main Rd, Indiranagar',
    '9th Cross Rd, Indiranagar',
    'Double Rd, Indiranagar',
    'CMH Road, Indiranagar',
    'Eshwara Temple Rd, Indiranagar',
    'HAL 2nd Stage, Indiranagar',
    'Appareddy Palya, Indiranagar',
    'Doopanahalli, Indiranagar'
  ]},
  { name: 'Whitefield', ward: 84, lat: 12.9698, lng: 77.7500, count: 10, addresses: [
    'ITPL Main Rd, Whitefield',
    'ECC Rd, Prithvi Layout, Whitefield',
    'Channasandra Main Rd, Whitefield',
    'Whitefield Main Rd, near Hope Farm',
    'Borewell Rd, Whitefield',
    'Nallurahalli Rd, Whitefield',
    'Varthur Main Rd, Whitefield',
    'Pattandur Agrahara Rd, Whitefield'
  ]},
  { name: 'JP Nagar', ward: 184, lat: 12.9063, lng: 77.5857, count: 8, addresses: [
    '15th Cross Rd, 6th Phase, JP Nagar',
    '24th Main Rd, 5th Phase, JP Nagar',
    'Sarakki Main Rd, 1st Phase, JP Nagar',
    'Rose Garden Rd, 15th Main, 5th Phase, JP Nagar',
    'Delmia Circle, JP Nagar 2nd Phase',
    'Elita Promenade Rd, JP Nagar 7th Phase',
    'Puttenahalli Rd, JP Nagar 6th Phase'
  ]},
  { name: 'Jayanagar', ward: 170, lat: 12.9250, lng: 77.5938, count: 8, addresses: [
    '9th Main Rd, 4th Block, Jayanagar',
    '11th Main Rd, 3rd Block, Jayanagar',
    'Ashoka Pillar Rd, 2nd Block, Jayanagar',
    'Jayanagar 5th Block, near Post Office',
    'South End Circle, Jayanagar',
    '18th Main Rd, 4th T Block, Jayanagar',
    'Jayanagar 9th Block, East End Rd'
  ]},
  { name: 'HSR Layout', ward: 174, lat: 12.9103, lng: 77.6450, count: 7, addresses: [
    '19th Main Rd, Sector 1, HSR Layout',
    '27th Main Rd, Sector 2, HSR Layout',
    '14th Main Rd, Sector 7, HSR Layout',
    'HSR Club Rd, Sector 3, HSR Layout',
    '5th Main Rd, Sector 6, HSR Layout',
    'Teacher’s Colony, HSR Layout',
    'Somasundrapalya Main Rd, HSR Layout'
  ]}
];

const ISSUE_TYPES_DEPT = [
  { type: 'pothole', dept: 'BBMP', handles: ['@BBMP_Official', '@BBMP_Sahaaya'] },
  { type: 'waterlogging', dept: 'BBMP', handles: ['@BBMP_Official', '@BruhathBBMP'] },
  { type: 'broken_streetlight', dept: 'BESCOM', handles: ['@BESCOM_Official'] },
  { type: 'garbage', dept: 'BBMP', handles: ['@BBMP_Official'] },
  { type: 'water_leakage', dept: 'BWSSB', handles: ['@BWSSB_Official'] },
  { type: 'damaged_footpath', dept: 'BBMP', handles: ['@BBMP_Official'] },
  { type: 'fallen_tree', dept: 'BBMP', handles: ['@BBMP_Official', '@BengaluruPolice'] }
];

export function getLevelFromXp(xp: number): string {
  if (xp >= 2000) return 'Hero 🏆';
  if (xp >= 500) return 'Guardian 🛡️';
  return 'Citizen 🏠';
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class Database {
  private data: Schema;

  constructor() {
    this.data = this.load();
    if (this.data.issues.length === 0) {
      this.seedInitialIssues();
    }
  }

  private load(): Schema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(fileContent);
      }
    } catch (e) {
      console.error('Error loading database file, initializing empty schema:', e);
    }
    this.save(initialSchema);
    return JSON.parse(JSON.stringify(initialSchema));
  }

  private save(data: Schema): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing to database file:', e);
    }
  }

  public getIssues(): Issue[] {
    return this.data.issues;
  }

  public getIssueById(id: string): Issue | undefined {
    return this.data.issues.find((issue) => issue.id === id);
  }

  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((user) => user.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(email: string, name: string, avatarUrl?: string): User {
    const existing = this.getUserByEmail(email);
    if (existing) return existing;

    const newUser: User = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      email,
      name,
      avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
      ward_number: 151,
      xp_points: 0,
      level: getLevelFromXp(0),
      created_at: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.save(this.data);
    return newUser;
  }

  public awardXp(userId: string, points: number, reason: string, issueId?: string): void {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return;

    user.xp_points += points;
    user.level = getLevelFromXp(user.xp_points);

    const xpLog: XpLog = {
      id: Math.random().toString(36).substring(2, 15),
      user_id: userId,
      points,
      reason,
      issue_id: issueId,
      created_at: new Date().toISOString()
    };

    this.data.xp_logs.push(xpLog);
    this.save(this.data);
  }

  public getXpLogs(userId: string): XpLog[] {
    return this.data.xp_logs.filter((log) => log.user_id === userId);
  }

  // Duplicate Check Formula: sqrt((lat2-lat1)² + (lng2-lng1)²) * 111000
  public checkDuplicate(lat: number, lng: number, issueType: IssueType): Issue | null {
    const openIssues = this.data.issues.filter(
      (issue) => issue.issue_type === issueType && issue.status !== 'resolved'
    );

    for (const issue of openIssues) {
      const distance =
        Math.sqrt(Math.pow(issue.latitude - lat, 2) + Math.pow(issue.longitude - lng, 2)) * 111000;
      if (distance < 100) {
        return issue;
      }
    }
    return null;
  }

  public createIssue(issueData: Partial<Issue> & { reported_by: string; latitude: number; longitude: number; issue_type: IssueType }): Issue {
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const issueTypeObj = ISSUE_TYPES_DEPT.find((it) => it.type === issueData.issue_type) || ISSUE_TYPES_DEPT[0];

    const department = issueData.department || issueTypeObj.dept;
    const authority_handle = issueData.authority_handle || getRandomItem(issueTypeObj.handles);
    const severity = issueData.severity || 5;

    // SLA Calculation
    const createdDate = new Date();
    let slaDays = 14;
    if (severity >= 8) slaDays = 3;
    else if (severity >= 5) slaDays = 7;
    const deadlineDate = new Date(createdDate.getTime());
    deadlineDate.setDate(deadlineDate.getDate() + slaDays);

    const newIssue: Issue = {
      id,
      reported_by: issueData.reported_by,
      photo_url: issueData.photo_url || 'https://picsum.photos/400/300?random=1',
      resolved_photo_url: null,
      latitude: issueData.latitude,
      longitude: issueData.longitude,
      ward_number: issueData.ward_number || 151,
      address_text: issueData.address_text || 'Bengaluru, India',
      issue_type: issueData.issue_type,
      severity,
      description: issueData.description || `Reported ${issueData.issue_type.replace('_', ' ')} issue.`,
      ai_confidence: issueData.ai_confidence || 90,
      department,
      status: 'open',
      upvote_count: 0,
      verification_count: 0,
      credibility_score: 0,
      tweet_url: null,
      sla_deadline: deadlineDate.toISOString(),
      ai_generated_tweet: issueData.ai_generated_tweet || '',
      authority_handle,
      created_at: createdDate.toISOString(),
      updated_at: createdDate.toISOString(),
      resolved_at: null
    };

    this.data.issues.unshift(newIssue); // add to top
    this.save(this.data);

    // Award +50 XP to reporter
    this.awardXp(issueData.reported_by, 50, `Reported civic issue: ${issueData.issue_type.replace('_', ' ')}`, id);

    return newIssue;
  }

  public upvoteIssue(issueId: string, userId: string): { success: boolean; issue?: Issue; message?: string } {
    const issue = this.getIssueById(issueId);
    if (!issue) return { success: false, message: 'Issue not found' };

    const existingUpvote = this.data.upvotes.find((uv) => uv.user_id === userId && uv.issue_id === issueId);
    if (existingUpvote) {
      return { success: false, message: 'Already upvoted', issue };
    }

    const newUpvote: Upvote = {
      id: Math.random().toString(36).substring(2, 15),
      user_id: userId,
      issue_id: issueId,
      created_at: new Date().toISOString()
    };

    this.data.upvotes.push(newUpvote);
    issue.upvote_count += 1;
    this.save(this.data);

    // Award +5 XP to upvoter
    this.awardXp(userId, 5, `Upvoted issue: ${issue.issue_type.replace('_', ' ')}`, issueId);

    return { success: true, issue };
  }

  public verifyIssue(issueId: string, userId: string): { success: boolean; issue?: Issue; message?: string } {
    const issue = this.getIssueById(issueId);
    if (!issue) return { success: false, message: 'Issue not found' };

    const existingVerification = this.data.verifications.find(
      (v) => v.user_id === userId && v.issue_id === issueId
    );
    if (existingVerification) {
      return { success: false, message: 'Already verified', issue };
    }

    const newVerification: Verification = {
      id: Math.random().toString(36).substring(2, 15),
      user_id: userId,
      issue_id: issueId,
      created_at: new Date().toISOString()
    };

    this.data.verifications.push(newVerification);
    issue.verification_count += 1;
    issue.credibility_score = Math.min(100, issue.verification_count * 20);
    this.save(this.data);

    // Award +10 XP to verifier
    this.awardXp(userId, 10, `Verified issue: ${issue.issue_type.replace('_', ' ')}`, issueId);

    // Bonus check: Issue verified by 3+ people: +30 XP bonus to the original reporter
    if (issue.verification_count === 3) {
      this.awardXp(issue.reported_by, 30, `Bonus: Your reported issue got 3+ verifications!`, issueId);
    }

    return { success: true, issue };
  }

  public updateIssueStatus(
    issueId: string,
    status: IssueStatus,
    resolvedPhotoUrl?: string | null
  ): { success: boolean; issue?: Issue; message?: string } {
    const issue = this.getIssueById(issueId);
    if (!issue) return { success: false, message: 'Issue not found' };

    const oldStatus = issue.status;
    issue.status = status;
    issue.updated_at = new Date().toISOString();

    if (status === 'resolved') {
      issue.resolved_at = new Date().toISOString();
      if (resolvedPhotoUrl) {
        issue.resolved_photo_url = resolvedPhotoUrl;
      }
      
      // Award +100 XP to the original reporter if transitioned to resolved
      if (oldStatus !== 'resolved') {
        this.awardXp(issue.reported_by, 100, `Your reported issue was resolved!`, issueId);
      }
    } else {
      issue.resolved_at = null;
      issue.resolved_photo_url = null;
    }

    this.save(this.data);
    return { success: true, issue };
  }

  public updateIssueTweetUrl(issueId: string, tweetUrl: string): { success: boolean; issue?: Issue; message?: string } {
    const issue = this.getIssueById(issueId);
    if (!issue) return { success: false, message: 'Issue not found' };

    issue.tweet_url = tweetUrl;
    this.save(this.data);
    return { success: true, issue };
  }

  public seedInitialIssues(): void {
    console.log('Seeding initial 60 issues...');
    this.data.issues = [];
    this.data.upvotes = [];
    this.data.verifications = [];
    this.data.xp_logs = [];

    let index = 1;

    for (const wardInfo of WARD_CENTERS) {
      for (let i = 0; i < wardInfo.count; i++) {
        const latOffset = (Math.random() - 0.5) * 0.006;
        const lngOffset = (Math.random() - 0.5) * 0.006;
        const latitude = wardInfo.lat + latOffset;
        const longitude = wardInfo.lng + lngOffset;

        const address_text = `${getRandomItem(wardInfo.addresses)}, Bengaluru`;
        const issueTypeObj = getRandomItem(ISSUE_TYPES_DEPT);
        const severity = Math.floor(Math.random() * 10) + 1;

        const randStatus = Math.random();
        let status: IssueStatus = 'open';
        if (randStatus > 0.4 && randStatus <= 0.7) {
          status = 'in_progress';
        } else if (randStatus > 0.7) {
          status = 'resolved';
        }

        const upvote_count = Math.floor(Math.random() * 47) + 1;
        const verification_count = Math.floor(Math.random() * 5);
        const credibility_score = Math.min(100, verification_count * 20);

        const daysAgo = Math.floor(Math.random() * 90);
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - daysAgo);
        const created_at = createdDate.toISOString();

        let slaDays = 14;
        if (severity >= 8) slaDays = 3;
        else if (severity >= 5) slaDays = 7;
        const deadlineDate = new Date(createdDate.getTime());
        deadlineDate.setDate(deadlineDate.getDate() + slaDays);
        const sla_deadline = deadlineDate.toISOString();

        let resolved_at: string | null = null;
        let resolved_photo_url: string | null = null;
        if (status === 'resolved') {
          const resolvedDays = Math.floor(Math.random() * slaDays) + 1;
          const resDate = new Date(createdDate.getTime());
          resDate.setDate(resDate.getDate() + resolvedDays);
          resolved_at = resDate.toISOString();
          resolved_photo_url = `https://picsum.photos/400/300?random=res_${index}`;
        }

        const issue_type = issueTypeObj.type as IssueType;
        const department = issueTypeObj.dept;
        const authority_handle = getRandomItem(issueTypeObj.handles);

        const ai_generated_tweet = `⚠️ ${issue_type.replace('_', ' ').toUpperCase()} on ${address_text}. Severity: ${severity}/10. ${authority_handle} please take immediate action. ${verification_count} citizens verified this issue. #CommunityHero #Bengaluru #${issue_type.replace('_', '')}`;

        this.data.issues.push({
          id: `seed_issue_${index}`,
          reported_by: '00000000-0000-0000-0000-000000000001',
          photo_url: `https://picsum.photos/400/300?random=${index}`,
          resolved_photo_url,
          latitude,
          longitude,
          ward_number: wardInfo.ward,
          address_text,
          issue_type,
          severity,
          description: `This is a reported ${issue_type.replace('_', ' ')} issue located at ${address_text}. Needs urgent attention from ${department}.`,
          ai_confidence: Math.floor(Math.random() * 20) + 80,
          department,
          status,
          upvote_count,
          verification_count,
          credibility_score,
          tweet_url: status === 'resolved' ? `https://twitter.com/CommunityHeroIN/status/12345678${index}` : null,
          sla_deadline,
          ai_generated_tweet,
          authority_handle,
          created_at,
          updated_at: created_at,
          resolved_at
        });

        index++;
      }
    }

    this.save(this.data);
    console.log('Seeded 60 issues successfully.');
  }
}

export const db = new Database();
