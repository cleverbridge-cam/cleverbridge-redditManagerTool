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

// Type for backend response
interface RecentMentionsResponse {
  posts: any[];
  average_sentiment: number;
}

const SentimentMonitor = () => {
  const [selectedSubreddit, setSelectedSubreddit] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [opportunityFilter, setOpportunityFilter] = useState(false);
  const [subredditInput, setSubredditInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [displayCount, setDisplayCount] = useState(25);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const queryClient = useQueryClient();

  // Optimized: Single query for recent mentions with longer stale time
  const recentMentionsQuery = useQuery<RecentMentionsResponse>({
    queryKey: ["recentMentions"],
    queryFn: async () => {
      const res = await axios.get(apiUrl("/recent-mentions"));
      return res.data as RecentMentionsResponse;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (reduced from 5)
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    refetchOnWindowFocus: false,
  });

  // Optimized: Separate query for flagged posts
  const flaggedQuery = useQuery<string[]>({
    queryKey: ["flaggedPosts"],
    queryFn: async () => {
      const res = await axios.get<string[]>(apiUrl("/flagged"));
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    initialData: [],
  });

  // Optimized: Separate query for monitored subreddits
  const subredditsQuery = useQuery<string[]>({
    queryKey: ["monitoredSubreddits"],
    queryFn: async () => {
      const res = await axios.get<string[]>(apiUrl("/monitored-subreddits"));
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    initialData: [],
  });

  // Optimized: Separate query for keywords
  const keywordsQuery = useQuery<string[]>({
    queryKey: ["keywords"],
    queryFn: async () => {
      const res = await axios.get<string[]>(apiUrl("/keywords"));
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    initialData: [],
  });

  const recentMentions = recentMentionsQuery.data?.posts ?? [];
  const average_sentiment = recentMentionsQuery.data?.average_sentiment ?? 0;
  const flaggedIds = flaggedQuery.data ?? [];
  const backendSubreddits = subredditsQuery.data ?? [];
  const keywords = keywordsQuery.data ?? [];

  // Memoized: Compute monitored subreddits with mention counts
  const allMonitoredSubreddits = useMemo(() => {
    return backendSubreddits.map(sub => {
      const subredditName = `r/${sub.replace(/^r\//i, "")}`;
      const mentions = recentMentions.filter(m => 
        m.subreddit.toLowerCase() === subredditName.toLowerCase()
      ).length;
      return { name: subredditName, mentions };
    });
  }, [backendSubreddits, recentMentions]);

  // Memoized: Filtered mentions based on current filters
  const filteredMentions = useMemo(() => {
    return recentMentions.filter((mention) => {
      const subredditMatches =
        selectedSubreddit === "all" ||
        mention.subreddit.toLowerCase() === `r/${selectedSubreddit}`.toLowerCase();
      const sentimentMatches =
        sentimentFilter === "all" || mention.sentiment === sentimentFilter;
      return subredditMatches && sentimentMatches;
    });
  }, [recentMentions, selectedSubreddit, sentimentFilter]);

  // Memoized: Apply additional filtering and pagination
  const { displayedMentions, totalFilteredMentions, hasMoreMentions } = useMemo(() => {
    let mentions = filteredMentions;
    
    if (showFlaggedOnly) {
      mentions = mentions.filter(m => flaggedIds.includes(m.id));
    } else if (opportunityFilter) {
      mentions = mentions.filter(m => m.status === "opportunity");
    }
    
    return {
      displayedMentions: mentions.slice(0, displayCount),
      totalFilteredMentions: mentions,
      hasMoreMentions: mentions.length > displayCount
    };
  }, [filteredMentions, flaggedIds, showFlaggedOnly, opportunityFilter, displayCount]);

  // Optimized: Mutations for better UX
  const flagMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'flag' | 'unflag' }) => {
      await axios.post(apiUrl(`/${action}`), { id });
      return { id, action };
    },
    onMutate: async ({ id, action }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["flaggedPosts"] });
      const previousFlagged = queryClient.getQueryData<string[]>(["flaggedPosts"]);
      
      queryClient.setQueryData<string[]>(["flaggedPosts"], (old = []) => {
        return action === 'flag' 
          ? [...old, id]
          : old.filter(flaggedId => flaggedId !== id);
      });
      
      return { previousFlagged };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousFlagged) {
        queryClient.setQueryData(["flaggedPosts"], context.previousFlagged);
      }
    },
  });

  const subredditMutation = useMutation({
    mutationFn: async ({ subreddit, action }: { subreddit: string; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        const response = await fetch(apiUrl('/monitored-subreddits'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subreddit }),
        });
        return await response.json();
      } else {
        const response = await fetch(apiUrl(`/monitored-subreddits/${subreddit.replace(/^r\//i, "")}`), {
          method: 'DELETE',
        });
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoredSubreddits"] });
      queryClient.invalidateQueries({ queryKey: ["recentMentions"] });
    },
  });

  const keywordMutation = useMutation({
    mutationFn: async ({ keyword, action }: { keyword: string; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        const response = await fetch(apiUrl('/keywords'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword }),
        });
        return await response.json();
      } else {
        const response = await fetch(apiUrl(`/keywords/${encodeURIComponent(keyword)}`), {
          method: 'DELETE',
        });
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
      queryClient.invalidateQueries({ queryKey: ["recentMentions"] });
    },
  });

  // Optimized handlers with useCallback
  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => prev + 25);
      setIsLoadingMore(false);
    }, 200); // Reduced delay
  }, []);

  const handleFlagPost = useCallback((id: string) => {
    const action = flaggedIds.includes(id) ? 'unflag' : 'flag';
    flagMutation.mutate({ id, action });
  }, [flaggedIds, flagMutation]);

  const handleAddSubreddit = useCallback(async () => {
    const sub = subredditInput.trim();
    if (sub && !backendSubreddits.includes(sub)) {
      setSubredditInput("");
      subredditMutation.mutate({ subreddit: sub, action: 'add' });
    }
  }, [subredditInput, backendSubreddits, subredditMutation]);

  const handleRemoveSubreddit = useCallback((subreddit: string) => {
    subredditMutation.mutate({ subreddit, action: 'remove' });
  }, [subredditMutation]);

  const handleAddKeyword = useCallback(() => {
    const keyword = keywordInput.trim();
    if (keyword && !keywords.includes(keyword)) {
      setKeywordInput("");
      keywordMutation.mutate({ keyword, action: 'add' });
    }
  }, [keywordInput, keywords, keywordMutation]);

  const handleRemoveKeyword = useCallback((keyword: string) => {
    keywordMutation.mutate({ keyword, action: 'remove' });
  }, [keywordMutation]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(25);
  }, [selectedSubreddit, sentimentFilter, showFlaggedOnly, opportunityFilter]);

  // Utility functions (moved outside render for better performance)
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

  const isLoading = recentMentionsQuery.isLoading || subredditsQuery.isLoading || keywordsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-muted-foreground">Opportunities</p>
                <p className="text-2xl font-bold text-success">{recentMentions.filter(m => m.status === "opportunity").length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Sentiment</p>
                <p className={`text-2xl font-bold ${average_sentiment > 0 ? 'text-success' : average_sentiment < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {average_sentiment > 0 ? '+' : average_sentiment < 0 ? '-' : ''}{Math.abs(average_sentiment)}
                </p>
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
                <Button 
                  variant="default" 
                  onClick={handleAddSubreddit}
                  disabled={subredditMutation.isPending}
                >
                  {subredditMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
              {allMonitoredSubreddits.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">No subreddits being monitored</p>
                </div>
              ) : (
                allMonitoredSubreddits.map((subreddit) => (
                  <div key={subreddit.name} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full" />
                      <div>
                        <div className="text-sm font-medium">{subreddit.name}</div>
                        <div className="text-xs text-muted-foreground">{subreddit.mentions} mentions</div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRemoveSubreddit(subreddit.name)}
                      disabled={subredditMutation.isPending}
                    >
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
                <Button 
                  variant="default" 
                  onClick={handleAddKeyword}
                  disabled={keywordMutation.isPending}
                >
                  {keywordMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
              {keywords.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">No keywords configured</p>
                </div>
              ) : (
                keywords.map((keyword) => (
                  <div key={keyword} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <div>
                        <div className="text-sm font-medium">{keyword}</div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRemoveKeyword(keyword)}
                      disabled={keywordMutation.isPending}
                    >
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
                      {allMonitoredSubreddits.map(subreddit => {
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
                      checked={showFlaggedOnly}
                      onChange={e => setShowFlaggedOnly(e.target.checked)}
                      className="checkbox-destructive"
                    />
                    <span className="text-xs text-foreground">Show Flagged Only</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 border border-border rounded bg-card">
                    <input
                      type="checkbox"
                      checked={opportunityFilter}
                      onChange={e => setOpportunityFilter(e.target.checked)}
                      className="checkbox-success"
                    />
                    <span className="text-xs text-foreground">Show Opportunities Only</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading mentions...</p>
                </div>
              ) : displayedMentions.length === 0 ? (
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
                            <span className="text-xs text-muted-foreground">u/{mention.author ?? "anonymous"}</span>
                            <span className="text-xs text-[#00ADEF]">{mention.sentiment} ({mention.score})</span>
                          </div>
                          <div className="text-sm font-medium mb-1">{mention.title}</div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                            <span>{mention.upvotes} upvotes</span>
                            <span>{mention.comments} comments</span>
                            <span>{mention.timeAgo}</span>
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
                            onClick={() => handleFlagPost(mention.id)}
                            disabled={flagMutation.isPending}
                          >
                            {flaggedIds.includes(mention.id) ? "Unflag" : "Flag"}
                          </Button>
                          <Button variant={mention.status === "opportunity" ? "default" : "outline"} size="sm">
                            Engage
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
