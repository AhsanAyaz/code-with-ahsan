export interface WinnerPlacement {
  teamName: string;
  projectDescription: string;
  judgeQuote: string;
}

export interface WinnersData {
  first: WinnerPlacement;
  second: WinnerPlacement;
  third: WinnerPlacement;
  announcedAt: string | null; // ISO string from Firestore Timestamp.toDate().toISOString()
}

export interface HackathonTwistThemeExample {
  theme: string;
  example: string;
}

export interface HackathonTwist {
  title: string;
  description: string;
  perThemeExamples: HackathonTwistThemeExample[];
}
