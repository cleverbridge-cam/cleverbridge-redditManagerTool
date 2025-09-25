import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  User, Shield, Clock, MessageCircle,
  Settings, Plus, Eye, EyeOff, Activity
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/config/api";

const AccountManager = () => {
  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading, isError } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/accounts"));
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    }
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  // Mutation for deleting account
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await fetch(apiUrl(`/accounts/${accountId}`), {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setModalOpen(false);
      setSelectedAccount(null);
    }
  });

  // Mutation for updating account status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ accountId, status }: { accountId: number; status: string }) => {
      const res = await fetch(apiUrl(`/accounts/${accountId}/status`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    }
  });

  // Handler for connect button
  const handleConnect = () => {
    window.location.href = apiUrl("/auth/login");
  };

  // Handler for cog/settings button
  const handleSettingsClick = (account: any) => {
    setSelectedAccount(account);
    setModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    if (status === "active") return "text-success";
    if (status === "cooldown") return "text-warning";
    if (status === "paused") return "text-muted-foreground";
    return "text-destructive";
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") return <Badge variant="default" className="bg-success">Active</Badge>;
    if (status === "cooldown") return <Badge variant="outline" className="text-warning border-warning">Cooldown</Badge>;
    if (status === "paused") return <Badge variant="outline" className="text-muted-foreground border-muted">Paused</Badge>;
    return <Badge variant="destructive">Flagged</Badge>;
  };

  const getKarmaColor = (karma: number) => {
    if (karma >= 5000) return "text-success";
    if (karma >= 2000) return "text-primary";
    if (karma >= 1000) return "text-warning";
    return "text-muted-foreground";
  };

  // Dynamic stats
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((a: any) => a.status === "active").length;
  const totalKarma = accounts.reduce((sum: number, a: any) => sum + (a.karma ?? 0), 0);
  const totalPosts = accounts.reduce((sum: number, a: any) => sum + (a.total_posts ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold">{totalAccounts}</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Accounts</p>
                <p className="text-2xl font-bold text-success">{activeAccounts}</p>
              </div>
              <Activity className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Karma</p>
                <p className="text-2xl font-bold">{totalKarma.toLocaleString()}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{totalPosts}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Management */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Management</CardTitle>
              <CardDescription>Monitor and control your Reddit accounts for outreach campaigns</CardDescription>
            </div>
            <Button variant="default" size="sm" onClick={handleConnect}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Reddit Account
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Loading accounts...</p>
            </div>
          ) : isError ? (
            <div className="text-center text-destructive py-8">
              <p className="text-sm">Failed to load accounts.</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">No accounts connected. Click 'Connect Reddit Account' to get started.</p>
            </div>
          ) : (
            accounts.map((account: any) => (
              <div key={account.id} className="border border-border/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-success" />
                        <h4 className="font-semibold text-sm">u/{account.username}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Connected: {new Date(account.created_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Karma: <span className={getKarmaColor(account.karma)}>{account.karma ?? 0}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        Posts: {account.total_posts ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => handleSettingsClick(account)}>
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={account.status === "active" ? "outline" : "default"}
                      size="sm"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          accountId: account.id,
                          status: account.status === "active" ? "paused" : "active"
                        })
                      }
                    >
                      {account.status === "active" ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await fetch(apiUrl(`/accounts/${account.id}/refresh_stats`), {
                          method: "POST"
                        });
                        queryClient.invalidateQueries({ queryKey: ["accounts"] });
                      }}
                    >
                      Refresh Stats
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      {/* Modal confirmation for account removal */}
      {modalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 shadow-lg w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Remove Account</h3>
            <p className="mb-6">Are you sure you want to remove <span className="font-bold">u/{selectedAccount.username}</span>?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteAccountMutation.mutate(selectedAccount.id)}>
                {deleteAccountMutation.status === "pending" ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Account Health</CardTitle>
            <CardDescription>Monitor account safety and compliance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success rounded-full" />
                <span className="text-sm">All accounts in good standing</span>
              </div>
              <Badge variant="outline" className="text-success border-success">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-warning rounded-full" />
                <span className="text-sm">1 account in cooldown period</span>
              </div>
              <Badge variant="outline" className="text-warning border-warning">Monitor</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                <span className="text-sm">Rate limits: Normal</span>
              </div>
              <Badge variant="outline">Normal</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common account management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Run Account Health Check
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Activity className="h-4 w-4 mr-2" />
              View Activity Logs
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Configure Rate Limits
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Plus className="h-4 w-4 mr-2" />
              Bulk Import Accounts
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountManager;