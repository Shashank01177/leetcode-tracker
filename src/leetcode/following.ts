import { getLeetCodeClient } from "./client";

export interface FollowedUser {
  username: string;
  realName?: string;
}

/**
 * Fetches the list of LeetCode users that YOU are following.
 * Requires LEETCODE_SESSION to be set (authenticated request).
 *
 * LeetCode paginates following lists — we fetch all pages automatically.
 */
export async function getFollowingList(myUsername: string): Promise<FollowedUser[]> {
  const lc = await getLeetCodeClient();
  const allUsers: FollowedUser[] = [];
  const limit = 20;
  let offset = 0;
  let totalCount = Infinity;

  while (allUsers.length < totalCount) {
    const result = await lc.graphql({
      operationName: "getFollowing",
      query: `
        query getFollowing($username: String!, $limit: Int!, $offset: Int!) {
          userSocialInfo(userSlug: $username) {
            following(limit: $limit, offset: $offset) {
              users {
                username
                profile {
                  realName
                }
              }
              totalCount
            }
          }
        }
      `,
      variables: { username: myUsername, limit, offset },
    }) as any;

    const data = result?.data?.userSocialInfo?.following;

    if (!data) {
      console.warn(
        "[Following] Could not fetch following list. " +
        "Make sure LEETCODE_SESSION is set correctly in your .env file."
      );
      break;
    }

    totalCount = data.totalCount ?? 0;
    const users: any[] = data.users ?? [];

    if (!users.length) break;

    for (const u of users) {
      allUsers.push({
        username: u.username,
        realName: u.profile?.realName ?? undefined,
      });
    }

    offset += users.length;

    if (allUsers.length >= totalCount) break;
  }

  return allUsers;
}
