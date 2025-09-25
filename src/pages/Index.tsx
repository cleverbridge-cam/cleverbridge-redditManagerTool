import Header from "@/components/Header";
import SentimentMonitor from "@/components/SentimentMonitor";
import OutreachDashboard from "@/components/OutreachDashboard";
import AccountManager from "@/components/AccountManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-background">
      <Header />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Reddit Sentiment Tracker</h1>
          <p className="text-muted-foreground text-sm">
            Internal tool for monitoring Reddit sentiment and managing outreach
          </p>
        </div>

        <Tabs defaultValue="monitor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monitor">Sentiment Monitor</TabsTrigger>
            <TabsTrigger value="outreach">Campaigns</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="space-y-6">
            <SentimentMonitor />
          </TabsContent>

          <TabsContent value="outreach" className="space-y-6">
            <OutreachDashboard />
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <AccountManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;