import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl } from "@/config/api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, TrendingDown, MessageCircle, ExternalLink,
  Clock, AlertTriangle, CheckCircle, Users, Flag, Target, Eye
} from "lucide-react";

// Type for Reddit post data
interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  sentiment: string;
  score: number;
  upvotes: number;
  comments: number;
  createdAt: string;
  status: string;
  keywords: string[];
  url: string;
}

// Type for backend response
interface RecentMentionsResponse {
  posts: RedditPost[];
  average_sentiment: number;
  flagged_ids?: string[];
  ignored_ids?: string[];
  engaged_ids?: string[];
  monitored_subreddits?: string[];
  keywords?: string[];
  stats?: {
    total_mentions: number;
    flagged_count: number;
    ignored_count: number;
    engaged_count: number;
    opportunities: number;
    average_sentiment: number;
  };
}

const SentimentMonitor = () => {
  const [selectedSubreddit, setSelectedSubreddit] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [engagedIds, setEngagedIds] = useState<string[]>([]); // Add state for engaged posts
  const [showUnprocessed, setShowUnprocessed] = useState(true);
  const [showFlagged, setShowFlagged] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [showEngaged, setShowEngaged] = useState(false);
  const [opportunityFilter, setOpportunityFilter] = useState(false);
  const [subredditInput, setSubredditInput] = useState("");
  const [manualSubreddits, setManualSubreddits] = useState<string[]>([]);
  // State for monitored subreddits from backend
  const [backendSubreddits, setBackendSubreddits] = useState<string[]>([]);

  // State for pagination
  const [displayCount, setDisplayCount] = useState(25);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // State for keywords management
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  const dashboardQuery = useQuery<RecentMentionsResponse>({
    queryKey: ["dashboardData"],
    queryFn: async () => {
      const res = await axios.get(apiUrl("/dashboard-data"));
      return res.data as RecentMentionsResponse;
    },
    staleTime: 1000 * 60 * 5,
  });
  const recentMentions = dashboardQuery.data?.posts ?? [];
  const average_sentiment = dashboardQuery.data?.average_sentiment ?? 0;
  const isLoading = dashboardQuery.isLoading;
  const error = dashboardQuery.error;

  // Get flagged, engaged, and ignored IDs from dashboard data instead of separate API calls
  useEffect(() => {
    if (dashboardQuery.data?.flagged_ids) {
      setFlaggedIds(dashboardQuery.data.flagged_ids);
    }
    if (dashboardQuery.data?.engaged_ids) {
      setEngagedIds(dashboardQuery.data.engaged_ids);
    }
    if (dashboardQuery.data?.ignored_ids) {
      setIgnoredIds(dashboardQuery.data.ignored_ids);
    }
  }, [dashboardQuery.data]);

  // Compute monitored subreddits dynamically from recentMentions
  const computedMonitoredSubreddits = Object.values(
    recentMentions.reduce((acc, mention) => {
      const name = mention.subreddit;
      if (!acc[name]) {
        acc[name] = { name, mentions: 0 };
      }
      acc[name].mentions += 1;
      return acc;
    }, {} as Record<string, { name: string; mentions: number }>)
  ) as Array<{ name: string; mentions: number }>;

  const getSentimentColor = (sentiment: string, score: number) => {
    if (sentiment === "positive") return "text-success";
    if (sentiment === "negative") return "text-destructive";
    return "text-muted-foreground";
  };

  const getSentimentBadge = (sentiment: string, status: string) => {
    if (status === "flagged") return <Badge variant="destructive">Flagged</Badge>;
    if (status === "opportunity") return <Badge variant="default">Opportunity</Badge>;
    if (sentiment === "positive") return <Badge variant="outline" className="text-success border-success">Positive</Badge>;
    if (sentiment === "negative") return <Badge variant="outline" className="text-destructive border-destructive">Negative</Badge>;
    return <Badge variant="outline">Neutral</Badge>;
  };

  const getStatusIcon = (status: string) => {
    if (status === "flagged") return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (status === "opportunity") return <CheckCircle className="h-4 w-4 text-success" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const filteredMentions = recentMentions.filter((mention) => {
    const subredditMatches =
      selectedSubreddit === "all" ||
      mention.subreddit.toLowerCase() === `r/${selectedSubreddit}`.toLowerCase();
    const sentimentMatches =
      sentimentFilter === "all" || mention.sentiment === sentimentFilter;
    return subredditMatches && sentimentMatches;
  });

  // Apply additional filtering (unprocessed/flagged/ignored/engaged/opportunities) and pagination
  const getDisplayedMentions = () => {
    let mentions = filteredMentions;
    
    // If showing ignored posts, that takes precedence
    if (showIgnored) {
      mentions = mentions.filter(m => ignoredIds.includes(m.id));
    } else if (showUnprocessed) {
      // Show only posts that haven't been processed in any way
      mentions = mentions.filter(m => 
        !flaggedIds.includes(m.id) && 
        !ignoredIds.includes(m.id) && 
        !engagedIds.includes(m.id)
      );
    } else {
      // Create a combined filtered array for all active filters
      let filteredResults: RedditPost[] = [];
      
      if (showFlagged) {
        filteredResults = [...filteredResults, ...mentions.filter(m => flaggedIds.includes(m.id))];
      }
      if (showEngaged) {
        filteredResults = [...filteredResults, ...mentions.filter(m => engagedIds.includes(m.id))];
      }
      if (opportunityFilter) {
        filteredResults = [...filteredResults, ...mentions.filter(m => m.status === "opportunity")];
      }
      
      // If any filter is selected, use the filtered results
      if (showFlagged || showEngaged || opportunityFilter) {
        // Remove duplicates in case a post matches multiple filters
        mentions = Array.from(new Set(filteredResults));
      } else {
        // If no filter is selected, show no posts
        mentions = [];
      }
    }
    
    return mentions.slice(0, displayCount);
  };

  const displayedMentions = getDisplayedMentions();
  
  // Calculate the total filtered mentions count for pagination
  const getTotalFilteredMentions = () => {
    let mentions = filteredMentions;
    
    // If showing ignored posts, that takes precedence
    if (showIgnored) {
      mentions = mentions.filter(m => ignoredIds.includes(m.id));
    } else if (showUnprocessed) {
      // Show only posts that haven't been processed in any way
      mentions = mentions.filter(m => 
        !flaggedIds.includes(m.id) && 
        !ignoredIds.includes(m.id) && 
        !engagedIds.includes(m.id)
      );
    } else {
      // Create a combined filtered array for all active filters
      let filteredResults: RedditPost[] = [];
      
      if (showFlagged) {
        filteredResults = [...filteredResults, ...mentions.filter(m => flaggedIds.includes(m.id))];
      }
      if (showEngaged) {
        filteredResults = [...filteredResults, ...mentions.filter(m => engagedIds.includes(m.id))];
      }
      if (opportunityFilter) {
        filteredResults = [...filteredResults, ...mentions.filter(m => m.status === "opportunity")];
      }
      
      // If any filter is selected, use the filtered results
      if (showFlagged || showEngaged || opportunityFilter) {
        // Remove duplicates in case a post matches multiple filters
        mentions = Array.from(new Set(filteredResults));
      } else {
        // If no filter is selected, show no posts
        mentions = [];
      }
    }
    
    return mentions;
  };

  const totalFilteredMentions = getTotalFilteredMentions();
  const hasMoreMentions = totalFilteredMentions.length > displayCount;

  // Function to load more posts
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayCount(prev => prev + 25);
      setIsLoadingMore(false);
    }, 300);
  };

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(25);
  }, [selectedSubreddit, sentimentFilter, showUnprocessed, showFlagged, showIgnored, showEngaged, opportunityFilter]);

  // Reset selectedSubreddit to 'all' if it's not present in monitoredSubreddits
  if (
    selectedSubreddit !== "all" &&
    !computedMonitoredSubreddits.some(sub => sub.name.toLowerCase() === `r/${selectedSubreddit}`.toLowerCase())
  ) {
    setSelectedSubreddit("all");
  }

  // Function to flag a post
  const flagPost = async (id: string) => {
    await axios.post(apiUrl("/flag"), { id });
    setFlaggedIds(prev => [...prev, id]);
  };

  // Function to unflag a post
  const unflagPost = async (id: string) => {
    await axios.post(apiUrl("/unflag"), { id });
    setFlaggedIds(prev => prev.filter(flaggedId => flaggedId !== id));
  };

  // Function to ignore a post
  const ignorePost = async (id: string) => {
    await axios.post(apiUrl("/ignore"), { id });
    setIgnoredIds(prev => [...prev, id]);
  };

  // Function to unignore a post
  const unignorePost = async (id: string) => {
    await axios.post(apiUrl("/unignore"), { id });
    setIgnoredIds(prev => prev.filter(ignoredId => ignoredId !== id));
  };

  // Function to engage with a post
  const engagePost = async (id: string) => {
    await axios.post(apiUrl("/engage"), { id });
    setEngagedIds(prev => [...prev, id]);
  };

  // Function to unengage from a post
  const unengagePost = async (id: string) => {
    await axios.post(apiUrl("/unengage"), { id });
    setEngagedIds(prev => prev.filter(engagedId => engagedId !== id));
  };

  // Add subreddit to backend
  async function addSubredditToBackend(subreddit: string) {
    try {
      const response = await fetch(apiUrl('/monitored-subreddits'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit }),
      });
      return await response.json();
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }

  // Remove subreddit from backend
  async function removeSubredditFromBackend(subreddit: string) {
    try {
      const response = await fetch(apiUrl(`/monitored-subreddits/${subreddit.replace(/^r\//i, "")}`), {
        method: 'DELETE',
      });
      return await response.json();
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }

  // Fetch monitored subreddits from backend on mount and after add/remove
  const fetchMonitoredSubreddits = async () => {
    try {
      const res = await fetch(apiUrl('/monitored-subreddits'));
      const data = await res.json();
      setBackendSubreddits(data);
    } catch {
      setBackendSubreddits([]);
    }
  };

  // Fetch monitored subreddits on component mount
  useEffect(() => {
    fetchMonitoredSubreddits();
  }, []);

  // Keywords management functions
  const fetchKeywords = async () => {
    try {
      const res = await fetch(apiUrl('/keywords'));
      const data = await res.json();
      setKeywords(data);
    } catch (error) {
      console.error('Failed to fetch keywords:', error);
    }
  };

  const addKeywordToBackend = async (keyword: string) => {
    try {
      const response = await fetch(apiUrl('/keywords'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const removeKeywordFromBackend = async (keyword: string) => {
    try {
      const response = await fetch(apiUrl(`/keywords/${encodeURIComponent(keyword)}`), {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  // Fetch keywords on component mount
  useEffect(() => {
    fetchKeywords();
  }, []);

  const handleAddSubreddit = async () => {
    const sub = subredditInput.trim();
    if (sub && !backendSubreddits.includes(sub)) {
      const result = await addSubredditToBackend(sub);
      if (result.success) {
        setSubredditInput("");
        dashboardQuery.refetch(); // Refetch mentions after adding
        fetchMonitoredSubreddits(); // Refetch backend subreddits
      } else {
        alert(result.error || 'Failed to add subreddit');
      }
    }
  };

  const handleRemoveSubreddit = async (subreddit: string) => {
    const result = await removeSubredditFromBackend(subreddit);
    if (result.success) {
      dashboardQuery.refetch(); // Refetch mentions after removing
      fetchMonitoredSubreddits(); // Refetch backend subreddits
    } else {
      alert(result.error || 'Failed to remove subreddit');
    }
  };

  const handleAddKeyword = async () => {
    const keyword = keywordInput.trim();
    if (keyword && !keywords.includes(keyword)) {
      const result = await addKeywordToBackend(keyword);
      if (result.success) {
        setKeywordInput("");
        // Update local state immediately to prevent flicker
        setKeywords(prev => [...prev, keyword]);
        // Refetch mentions after adding keyword
        dashboardQuery.refetch();
      } else {
        alert(result.error || 'Failed to add keyword');
      }
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    const result = await removeKeywordFromBackend(keyword);
    if (result.success) {
      // Update local state immediately to prevent flicker
      setKeywords(prev => prev.filter(k => k !== keyword));
      // Refetch mentions after removing keyword
      dashboardQuery.refetch();
    } else {
      alert(result.error || 'Failed to remove keyword');
    }
  };

  // Only use backend subreddits for display, with mention counts
  const allMonitoredSubreddits = backendSubreddits.map(sub => {
    const subredditName = `r/${sub.replace(/^r\//i, "")}`;
    const mentions = recentMentions.filter(m => m.subreddit.toLowerCase() === subredditName.toLowerCase()).length;
    return { name: subredditName, mentions };
  });

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Mentions</p>
                <p className="text-2xl font-bold">{recentMentions.length}</p>
              </div>
              <Eye className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold text-destructive">{flaggedIds.length}</p>
              </div>
              <Flag className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engaged</p>
                <p className="text-2xl font-bold text-blue-500">{engagedIds.length}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ignored</p>
                <p className="text-2xl font-bold text-muted-foreground">{ignoredIds.length}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opportunities</p>
                <p className="text-2xl font-bold text-success">{recentMentions.filter(m => m.status === "opportunity").length}</p>
              </div>
              <Target className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Monitored Subreddits and Keywords */}
        <div className="space-y-6">
          {/* Monitored Subreddits */}
          <Card>
            <CardHeader><CardTitle className="text-base">Monitored Subreddits</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 mb-4">
                <input
                  className="border rounded px-2 py-1 w-full bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="Add subreddit (e.g. SaaS)"
                  value={subredditInput}
                  onChange={e => setSubredditInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddSubreddit(); }}
                />
                <Button variant="default" onClick={handleAddSubreddit}>Add</Button>
              </div>
              {allMonitoredSubreddits.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">No subreddits being monitored</p>
                </div>
              ) : (
                allMonitoredSubreddits.map((subreddit, index) => (
                  <div key={subreddit.name} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full" />
                      <div>
                        <div className="text-sm font-medium">{subreddit.name}</div>
                        <div className="text-xs text-muted-foreground">{subreddit.mentions} mentions</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRemoveSubreddit(subreddit.name)}>
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Keywords Management */}
          <Card>
            <CardHeader><CardTitle className="text-base">Search Keywords</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 mb-4">
                <input
                  className="border rounded px-2 py-1 w-full bg-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="Add keyword (e.g. payment)"
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddKeyword(); }}
                />
                <Button variant="default" onClick={handleAddKeyword}>Add</Button>
              </div>
              {keywords.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">No keywords configured</p>
                </div>
              ) : (
                keywords.map((keyword, index) => (
                  <div key={keyword} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <div>
                        <div className="text-sm font-medium">{keyword}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRemoveKeyword(keyword)}>
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Mentions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Mentions</CardTitle>
                <div className="flex gap-2 items-center">
                  <Select value={selectedSubreddit} onValueChange={setSelectedSubreddit}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subreddits</SelectItem>
                      {computedMonitoredSubreddits.map(subreddit => {
                        const value = subreddit.name.replace(/^r\//i, "");
                        return (
                          <SelectItem key={subreddit.name} value={value}>{subreddit.name}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 px-2 py-1 border border-border rounded bg-card">
                    <input
                      type="checkbox"
                      checked={showUnprocessed}
                      onChange={e => {
                        setShowUnprocessed(e.target.checked);
                        if (e.target.checked) {
                          setShowFlagged(false);
                          setShowIgnored(false);
                          setShowEngaged(false);
                          setOpportunityFilter(false);
                        }
                      }}
                      className="checkbox-primary"
                    />
                    <span className="text-xs text-foreground">Unprocessed Only</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 border border-border rounded bg-card">
                    <input
                      type="checkbox"
                      checked={showFlagged}
                      onChange={e => {
                        setShowFlagged(e.target.checked);
                        if (e.target.checked) setShowUnprocessed(false);
                      }}
                      className="checkbox-destructive"
                    />
                    <span className="text-xs text-foreground">Flagged</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 border border-border rounded bg-card">
                    <input
                      type="checkbox"
                      checked={showIgnored}
                      onChange={e => {
                        setShowIgnored(e.target.checked);
                        if (e.target.checked) setShowUnprocessed(false);
                      }}
                      className="checkbox-warning"
                    />
                    <span className="text-xs text-foreground">Ignored</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 border border-border rounded bg-card">
                    <input
                      type="checkbox"
                      checked={showEngaged}
                      onChange={e => {
                        setShowEngaged(e.target.checked);
                        if (e.target.checked) setShowUnprocessed(false);
                      }}
                      className="checkbox-blue"
                    />
                    <span className="text-xs text-foreground">Engaged</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 border border-border rounded bg-card">
                    <input
                      type="checkbox"
                      checked={opportunityFilter}
                      onChange={e => {
                        setOpportunityFilter(e.target.checked);
                        if (e.target.checked) setShowUnprocessed(false);
                      }}
                      className="checkbox-success"
                    />
                    <span className="text-xs text-foreground">Opportunities</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {displayedMentions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">No recent mentions found</p>
                </div>
              ) : (
                <>
                  {displayedMentions.map((mention) => (
                    <div key={mention.id} className="border rounded p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(mention.status ?? "neutral")}
                            <Badge variant="outline" className="text-xs">{mention.subreddit}</Badge>
                            {getSentimentBadge(mention.sentiment, mention.status ?? "")}
                            <span className="text-xs text-muted-foreground">
                              u/{mention.author} • {mention.createdAt}
                            </span>
                            <span className="text-xs text-[#00ADEF]">{mention.sentiment} ({mention.score.toFixed(2)})</span>
                          </div>
                          <div className="text-sm font-medium mb-1">{mention.title}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                            <span>{mention.upvotes} upvotes</span>
                            <span>{mention.comments} comments</span>
                          </div>
                          {mention.keywords && (
                            <div className="flex flex-wrap gap-1">
                              {mention.keywords.map((keyword: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{keyword}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 ml-3">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={mention.url} target="_blank" rel="noopener noreferrer">View</a>
                          </Button>
                          <Button
                            variant={flaggedIds.includes(mention.id) ? "outline" : "destructive"}
                            size="sm"
                            onClick={() => flaggedIds.includes(mention.id) ? unflagPost(mention.id) : flagPost(mention.id)}
                          >
                            {flaggedIds.includes(mention.id) ? "Unflag" : "Flag"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => ignoredIds.includes(mention.id) ? unignorePost(mention.id) : ignorePost(mention.id)}
                          >
                            {ignoredIds.includes(mention.id) ? "Unignore" : "Ignore"}
                          </Button>
                          <Button
                            variant={engagedIds.includes(mention.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => engagedIds.includes(mention.id) ? unengagePost(mention.id) : engagePost(mention.id)}
                          >
                            {engagedIds.includes(mention.id) ? "Engaged" : "Engage"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* View More Button */}
                  {hasMoreMentions && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="flex items-center gap-2"
                      >
                        {isLoadingMore ? (
                          <>
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            View More ({totalFilteredMentions.length - displayCount} remaining)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SentimentMonitor;
