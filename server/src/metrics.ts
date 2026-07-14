/**
 * Verified-live Metricool metric names, per network.
 *
 * These were confirmed against a real account with real data — NOT taken from
 * Metricool's docs, which are frequently wrong. Metricool returns 200 OK with
 * an empty array for a metric name that exists in the enum but is never
 * populated, which is indistinguishable from "unsupported" unless you check.
 *
 * To rediscover the valid enum for a new network: send a deliberately invalid
 * metric value. The validation error lists every valid value for that
 * endpoint+network pair. Then fetch each plausible one and confirm it returns
 * non-empty data before wiring it into the UI.
 *
 * Metrics known to be permanently empty are listed in DEAD_METRICS so nobody
 * "rediscovers" them and wires them up again.
 */

export const NETWORKS = ['facebook', 'instagram', 'youtube'] as const;
export type Network = (typeof NETWORKS)[number];

/** Metricool requires this on every timelines/distribution call. Never infer it. */
export const SUBJECTS = [
  'account',
  'posts',
  'reels',
  'stories',
  'competitors',
] as const;
export type Subject = (typeof SUBJECTS)[number];

export interface MetricSpec {
  /** The exact metric string Metricool expects. */
  metric: string;
  /** Metricool's `subject` for this metric. Always explicit — see §3. */
  subject: Subject;
  /** Stable key the frontend addresses this metric by. */
  key: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/* Timeline metrics                                                    */
/* ------------------------------------------------------------------ */

export const TIMELINE_METRICS: Record<Network, MetricSpec[]> = {
  facebook: [
    { key: 'followers', metric: 'pageFollows', subject: 'account', label: 'Followers' },
    { key: 'newFollowers', metric: 'page_daily_follows_unique', subject: 'account', label: 'New followers' },
    { key: 'lostFollowers', metric: 'page_daily_unfollows_unique', subject: 'account', label: 'Lost followers' },
    { key: 'reach', metric: 'page_posts_impressions', subject: 'account', label: 'Reach' },
    // page_media_view is the only click-ish metric Meta still populates.
    // page_total_actions / ctaClicks / page_website_clicks_logged_in_unique
    // are all permanently empty — see DEAD_METRICS.
    { key: 'clicks', metric: 'page_media_view', subject: 'account', label: 'Page views' },
    { key: 'reactions', metric: 'page_actions_post_reactions_total', subject: 'account', label: 'Reactions' },
    { key: 'interactions', metric: 'postsInteractions', subject: 'account', label: 'Interactions' },
    // Note: subject is 'account', despite the name containing "posts".
    // Routing this to subject=posts 500s with "Not implemented metric".
    { key: 'postsCount', metric: 'postsCount', subject: 'account', label: 'Posts published' },
  ],

  instagram: [
    { key: 'followers', metric: 'followers', subject: 'account', label: 'Followers' },
    { key: 'deltaFollowers', metric: 'delta_followers', subject: 'account', label: 'Follower change' },
    { key: 'reach', metric: 'reach', subject: 'account', label: 'Reach' },
    { key: 'impressions', metric: 'impressions', subject: 'account', label: 'Impressions' },
    { key: 'profileViews', metric: 'profile_views', subject: 'account', label: 'Profile views' },
    { key: 'clicks', metric: 'website_clicks', subject: 'account', label: 'Website clicks' },
    { key: 'interactions', metric: 'postsInteractions', subject: 'account', label: 'Interactions' },
    { key: 'accountsEngaged', metric: 'accounts_engaged', subject: 'account', label: 'Accounts engaged' },
    { key: 'postsCount', metric: 'postsCount', subject: 'account', label: 'Posts published' },
  ],

  // This is the ENTIRE valid enum for YouTube timelines. No more exist.
  youtube: [
    { key: 'subscribers', metric: 'totalSubscribers', subject: 'account', label: 'Subscribers' },
    { key: 'views', metric: 'views', subject: 'account', label: 'Views' },
    { key: 'videos', metric: 'totalVideos', subject: 'account', label: 'Videos' },
    { key: 'subscribersGained', metric: 'subscribersGained', subject: 'account', label: 'Subscribers gained' },
    { key: 'subscribersLost', metric: 'subscribersLost', subject: 'account', label: 'Subscribers lost' },
  ],
};

/* ------------------------------------------------------------------ */
/* Distribution metrics                                                */
/* ------------------------------------------------------------------ */

export const DISTRIBUTION_METRICS: Record<Network, MetricSpec[]> = {
  facebook: [
    // page_follows_* are the real ones. followersByCountry/followersByCity are
    // accepted by the API and return [] forever.
    { key: 'country', metric: 'page_follows_country', subject: 'account', label: 'Followers by country' },
    { key: 'city', metric: 'page_follows_city', subject: 'account', label: 'Followers by city' },
    { key: 'postsTypes', metric: 'postsTypes', subject: 'account', label: 'Content types' },
  ],

  instagram: [
    { key: 'gender', metric: 'gender', subject: 'account', label: 'Gender' },
    { key: 'age', metric: 'age', subject: 'account', label: 'Age' },
    { key: 'country', metric: 'country', subject: 'account', label: 'Country' },
    { key: 'city', metric: 'city', subject: 'account', label: 'City' },
    { key: 'postsTypes', metric: 'postsTypes', subject: 'account', label: 'Content types' },
  ],

  // Metricool has no YouTube demographics at all — the endpoint 500s with
  // "Not implemented metric ... at YouTubeAnalyticsExtractor" for every value.
  // Don't build a Demographics tab for YouTube.
  youtube: [],
};

/* ------------------------------------------------------------------ */
/* Capabilities + dead ends                                            */
/* ------------------------------------------------------------------ */

export interface NetworkCapabilities {
  timelines: boolean;
  distribution: boolean;
  /** Metricool exposes no per-video list for YouTube — always returns []. */
  posts: boolean;
  competitors: boolean;
}

export const NETWORK_CAPABILITIES: Record<Network, NetworkCapabilities> = {
  facebook: { timelines: true, distribution: true, posts: true, competitors: true },
  instagram: { timelines: true, distribution: true, posts: true, competitors: true },
  youtube: { timelines: true, distribution: false, posts: false, competitors: false },
};

/**
 * Accepted by Metricool's validation but permanently empty on live accounts.
 * Kept here so they are never wired into the UI again.
 */
export const DEAD_METRICS: Record<string, string> = {
  'facebook:likes': 'Permanently empty on Meta\'s side.',
  'facebook:pageImpressions': 'Empty — use page_posts_impressions.',
  'facebook:page_total_actions': 'Meta deprecated click tracking.',
  'facebook:ctaClicks': 'Meta deprecated click tracking.',
  'facebook:page_website_clicks_logged_in_unique': 'Meta deprecated click tracking.',
  'facebook:followersByCountry': 'Accepted but empty — use page_follows_country.',
  'facebook:followersByCity': 'Accepted but empty — use page_follows_city.',
  'facebook:reachByLocale': 'Genuine dead end.',
  'facebook:pageImpressions.*':
    'Meta deprecated Facebook Page age/gender demographics ~Sept 2024.',
  'instagram:email_contacts': 'Not tracked for standard business accounts.',
  'instagram:get_directions_clicks': 'Not tracked for standard business accounts.',
  'instagram:phone_call_clicks': 'Not tracked for standard business accounts.',
  'instagram:text_message_clicks': 'Not tracked for standard business accounts.',
  'instagram:clicks_total': 'Not tracked for standard business accounts.',
};

export function getTimelineSpec(network: Network, key: string): MetricSpec | undefined {
  return TIMELINE_METRICS[network]?.find((m) => m.key === key);
}

export function getDistributionSpec(network: Network, key: string): MetricSpec | undefined {
  return DISTRIBUTION_METRICS[network]?.find((m) => m.key === key);
}
