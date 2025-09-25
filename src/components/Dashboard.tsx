import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import axios from "axios";
import { apiUrl } from "@/config/api";

import {
  TrendingUp, TrendingDown, Users, MessageCircle,
  ArrowUpRight, ArrowDownRight, Activity, Clock
} from "lucide-react";

const Dashboard = () => {
  const sentimentData = [
    { subreddit: "r/technology", positive: 68, negative: 22, neutral: 10, posts: 142 },
    { subreddit: "r/startups", positive: 45, negative: 35, neutral: 20, posts: 89 },
    { subreddit: "r/entrepreneur", positive: 72, negative: 18, neutral: 10, posts: 156 },
    { subreddit: "r/investing", positive: 38, negative: 42, neutral: 20, posts: 203 },
  ];

  const [recentMentions, setRecentMentions] = useState<any[]>([]);

  useEffect(() => {
    axios.get(apiUrl("/recent-mentions"))
      .then((res) => {
        setRecentMentions(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Failed to fetch recent mentions:", err);
      });
  }, []);

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          Real-time sentiment monitoring across your target subreddits
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mentions</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <div className="flex items-center text-xs text-success">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12.5% from last week
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+0.32</div>
            <div className="flex items-center text-xs text-success">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +0.08 from last week
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagements</CardTitle>
            <MessageCircle className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <div className="flex items-center text-xs text-destructive">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              -3.2% from last week
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              Last active 2h ago
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subreddit Sentiment */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Subreddit Sentiment Analysis</CardTitle>
            <CardDescription>Real-time sentiment breakdown by subreddit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sentimentData.map((data, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{data.subreddit}</span>
                  <span className="text-sm text-muted-foreground">{data.posts} posts</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-success">Positive ({data.positive}%)</span>
                    </div>
                    <Progress value={data.positive} className="h-2" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-destructive">Negative ({data.negative}%)</span>
                    </div>
                    <Progress value={data.negative} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Mentions */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Recent Mentions</CardTitle>
            <CardDescription>Latest posts requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentMentions.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent mentions found.</p>
            )}
            {recentMentions.map((mention) => (
              <div key={mention.id} className="border border-border/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{mention.subreddit}</Badge>
                      <Badge
                        variant={
                          mention.sentiment === "positive"
                            ? "default"
                            : mention.sentiment === "neutral"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {mention.sentiment.charAt(0).toUpperCase() + mention.sentiment.slice(1)}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm leading-tight">{mention.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {mention.upvotes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {mention.comments}
                      </span>
                      <span>{mention.timeAgo}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={mention.url} target="_blank" rel="noopener noreferrer">
                      Engage
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Dashboard;
