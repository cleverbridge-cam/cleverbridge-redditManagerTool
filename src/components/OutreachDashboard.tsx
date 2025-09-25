import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Play, Pause, Settings, MessageSquare, Target, 
  Calendar, Users, TrendingUp, Clock, Edit3
} from "lucide-react";

const OutreachDashboard = () => {
  const activeCampaigns = [
    {
      id: 1,
      name: "SaaS Tool Awareness",
      status: "active",
      accounts: 3,
      subreddits: ["r/entrepreneur", "r/startups", "r/SaaS"],
      engaged: 45,
      target: 100,
      responses: 12,
      sentiment: 0.3,
      lastActivity: "2h ago",
      progress: 45
    },
    {
      id: 2,
      name: "Customer Support Engagement",
      status: "paused",
      accounts: 2,
      subreddits: ["r/technology", "r/webdev"],
      engaged: 23,
      target: 50,
      responses: 8,
      sentiment: 0.6,
      lastActivity: "1d ago",
      progress: 46
    },
    {
      id: 3,
      name: "Community Building",
      status: "active",
      accounts: 4,
      subreddits: ["r/marketing", "r/growthtracking", "r/entrepreneur"],
      engaged: 78,
      target: 150,
      responses: 24,
      sentiment: 0.4,
      lastActivity: "30m ago",
      progress: 52
    }
  ];

  const templates = [
    {
      id: 1,
      name: "Helpful Solution",
      category: "Support",
      useCount: 23,
      sentiment: 0.7,
      preview: "I've had similar challenges with... Here's what worked for us..."
    },
    {
      id: 2,
      name: "Community Engagement",
      category: "Engagement",
      useCount: 15,
      sentiment: 0.5,
      preview: "Great discussion! I'd love to share our experience with..."
    },
    {
      id: 3,
      name: "Thought Leadership",
      category: "Authority",
      useCount: 31,
      sentiment: 0.6,
      preview: "This is a common problem in our industry. From our research..."
    }
  ];

  const getStatusColor = (status: string) => {
    if (status === "active") return "text-success";
    if (status === "paused") return "text-warning";
    return "text-muted-foreground";
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") return <Badge variant="default" className="bg-success">Active</Badge>;
    if (status === "paused") return <Badge variant="outline" className="text-warning border-warning">Paused</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Campaign Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <Play className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Engagements</p>
                <p className="text-2xl font-bold">146</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">30%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Sentiment</p>
                <p className="text-2xl font-bold text-success">+0.43</p>
              </div>
              <Target className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Campaigns */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campaign Management</CardTitle>
                <CardDescription>Monitor and control your outreach campaigns</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                New Campaign
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeCampaigns.map((campaign) => (
              <div key={campaign.id} className="border border-border/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{campaign.name}</h4>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {campaign.accounts} accounts
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {campaign.subreddits.length} subreddits
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {campaign.lastActivity}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress: {campaign.engaged}/{campaign.target}</span>
                        <span>{campaign.progress}%</span>
                      </div>
                      <Progress value={campaign.progress} className="h-2" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {campaign.subreddits.slice(0, 3).map((subreddit, i) => (
                        <Badge key={i} variant="secondary" className="text-xs px-2 py-1">
                          {subreddit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="sm">
                      {campaign.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Message Templates */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Message Templates</CardTitle>
                <CardDescription>Pre-built responses for common scenarios</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                New Template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="border border-border/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{template.name}</h4>
                      <Badge variant="outline" className="text-xs">{template.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {template.preview}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Used {template.useCount} times
                      </span>
                      <span className={`flex items-center gap-1 ${template.sentiment >= 0.5 ? 'text-success' : 'text-warning'}`}>
                        <TrendingUp className="h-3 w-3" />
                        {template.sentiment.toFixed(1)} avg sentiment
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="sm">
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OutreachDashboard;