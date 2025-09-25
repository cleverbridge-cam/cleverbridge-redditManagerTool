import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, Users, MessageSquareText, BarChart3, 
  Zap, Shield, Clock, Target 
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Brain,
      title: "AI Sentiment Analysis",
      description: "Advanced natural language processing to understand sentiment, emotion, and context in real-time across all Reddit conversations.",
      badge: "AI-Powered",
      color: "text-primary"
    },
    {
      icon: Users,
      title: "Multi-Account Management",
      description: "Seamlessly manage multiple Reddit accounts with intelligent scheduling and engagement strategies to maximize reach.",
      badge: "Pro Feature",
      color: "text-info"
    },
    {
      icon: MessageSquareText,
      title: "Smart Templates",
      description: "Pre-built and customizable message templates with dynamic variables for personalized, authentic engagement at scale.",
      badge: "Automation",
      color: "text-success"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive reporting with sentiment trends, engagement metrics, and ROI tracking across all your campaigns.",
      badge: "Analytics",
      color: "text-warning"
    },
    {
      icon: Target,
      title: "Precision Targeting",
      description: "Target specific subreddits, keywords, user profiles, and conversation types with laser-focused monitoring capabilities.",
      badge: "Targeting",
      color: "text-primary"
    },
    {
      icon: Zap,
      title: "Real-time Alerts",
      description: "Instant notifications for negative sentiment, brand mentions, or engagement opportunities so you never miss a moment.",
      badge: "Real-time",
      color: "text-reddit-orange"
    },
    {
      icon: Shield,
      title: "Compliance & Safety",
      description: "Built-in safeguards and Reddit compliance features to ensure your engagement follows community guidelines.",
      badge: "Safety",
      color: "text-destructive"
    },
    {
      icon: Clock,
      title: "Automated Scheduling",
      description: "Schedule posts and responses for optimal timing based on subreddit activity patterns and audience behavior.",
      badge: "Automation",
      color: "text-success"
    }
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <Badge variant="outline" className="mb-4">
          Complete Feature Set
        </Badge>
        <h2 className="text-3xl font-bold mb-4">
          Everything You Need for 
          <span className="bg-gradient-primary bg-clip-text text-transparent"> Reddit Success</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Powerful tools designed for community managers, marketers, and power users who need to monitor, 
          analyze, and engage with Reddit at scale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {features.map((feature, index) => (
          <Card key={index} className="bg-gradient-card border-border/50 hover:shadow-card transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-background/50 ${feature.color}`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {feature.badge}
                </Badge>
              </div>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button variant="hero" size="lg" className="px-8">
          Explore All Features
        </Button>
      </div>
    </section>
  );
};

export default FeaturesSection;