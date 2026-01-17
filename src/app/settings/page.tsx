"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetPortfolio } from "@/components/shared/utils/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Loader2,
  Settings,
  RefreshCw,
  AlertTriangle,
  Bell,
  Zap,
} from "lucide-react";

export default function SettingsPage() {
  const [capital, setCapital] = useState(1000000);
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: async (newCapital: number) => {
      // Call real API
      const result = await resetPortfolio(newCapital);
      if (!result.success) {
        throw new Error(result.message || "Failed to reset");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });

  const handleReset = () => {
    if (
      confirm(
        `本当にポートフォリオをリセットしますか？\n\n初期資金: ¥${capital.toLocaleString()}\n\n※すべての取引履歴と保有株が削除されます`,
      )
    ) {
      resetMutation.mutate(capital);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-4">
        <Link href="/">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold font-sans tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5" /> 設定
        </h1>
      </header>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        {/* Capital Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              ポートフォリオ設定
            </CardTitle>
            <CardDescription>
              初期資金を設定してポートフォリオをリセットします
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">初期資金（円）</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  min={100000}
                  step={100000}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[500000, 1000000, 3000000, 5000000, 10000000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setCapital(amount)}
                  >
                    ¥{(amount / 10000).toLocaleString()}万
                  </Button>
                ))}
              </div>
            </div>

            {resetMutation.isSuccess && (
              <div className="bg-green-500/10 text-green-500 p-3 rounded-lg text-sm">
                ✓ ポートフォリオがリセットされました
              </div>
            )}

            {resetMutation.isError && (
              <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm">
                エラー: {(resetMutation.error as Error)?.message}
              </div>
            )}

            <Button
              onClick={handleReset}
              disabled={resetMutation.isPending}
              variant="destructive"
              className="w-full"
            >
              {resetMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <AlertTriangle className="mr-2 h-4 w-4" />
              ポートフォリオをリセット
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              通知設定
            </CardTitle>
            <CardDescription>
              In-App Swipe通知 - コンテキスト切り替せずに高速通知
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700">
                  In-App Swipe有効化済み
                </span>
              </div>
              <p className="text-sm text-green-600">
                Slack WebhookからのIn-App Swipe通知への移行が完了しました！
                スワipe操作で素早く対応でき、アプリを離れる必要がありません。
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span>価格アラート</span>
                <span className="text-green-600">有効</span>
              </div>
              <div className="flex justify-between items-center">
                <span>取引通知</span>
                <span className="text-green-600">有効</span>
              </div>
              <div className="flex justify-between items-center">
                <span>ポートフォリオ警告</span>
                <span className="text-green-600">有効</span>
              </div>
              <div className="flex justify-between items-center">
                <span>システム通知</span>
                <span className="text-green-600">有効</span>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">
                <strong>操作方法:</strong> 左スワイプで無視、右スワイプで実行
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>注意:</strong>{" "}
              リセットするとすべての取引履歴と保有株が削除されます。
              この操作は取り消せません。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
