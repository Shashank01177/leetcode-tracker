import { RecentSubmission, UserContestInfo } from "leetcode-query";
import { getLeetCodeClient } from "./client";

export interface AcSubmission {
  title: string;
  titleSlug: string;
  timestamp: string; // unix timestamp string from LeetCode
  lang: string;
}

export interface ContestRating {
  rating: number | null;
  globalRanking: number | null;
  attendedContestsCount: number | null;
  topPercentage: number | null;
}

/**
 * Fetch the most recent accepted submissions for a LeetCode user.
 * The 2.x `recent_submissions()` returns ALL recent submissions (up to `limit`),
 * so we filter to only "Accepted" ones.
 */
export async function getRecentAcSubmissions(
  username: string,
  limit = 20
): Promise<AcSubmission[]> {
  const lc = await getLeetCodeClient();
  const all: RecentSubmission[] = await lc.recent_submissions(username, limit);
  return all
    .filter((s) => s.statusDisplay === "Accepted")
    .map((s) => ({
      title: s.title,
      titleSlug: s.titleSlug,
      timestamp: s.timestamp,
      lang: s.lang,
    }));
}

/**
 * Fetch the current contest rating and ranking for a LeetCode user.
 */
export async function getContestRating(
  username: string
): Promise<ContestRating> {
  const lc = await getLeetCodeClient();

  let info: UserContestInfo;
  try {
    info = await lc.user_contest_info(username);
  } catch {
    return { rating: null, globalRanking: null, attendedContestsCount: null, topPercentage: null };
  }

  const ranking = info?.userContestRanking ?? null;

  return {
    rating: ranking?.rating ?? null,
    globalRanking: ranking?.globalRanking ?? null,
    attendedContestsCount: ranking?.attendedContestsCount ?? null,
    topPercentage: ranking?.topPercentage ?? null,
  };
}
