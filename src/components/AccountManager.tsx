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

  const handleRedditAuth = () => {
    // Open Reddit OAuth in a popup
    const width = 600;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      apiUrl("/auth/login"),
      "Reddit Authorization",
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Account Management</CardTitle>
              <CardDescription>Monitor and control your Reddit accounts for outreach campaigns</CardDescription>
            </div>
            <Button onClick={handleRedditAuth} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Connect Reddit Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No accounts connected. Click 'Connect Reddit Account' to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <Card key={account.id} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{account.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Connected {new Date(account.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedAccount(account);
                            setModalOpen(true);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
    </div>
  );
};

export default AccountManager;