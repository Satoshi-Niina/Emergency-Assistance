import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { 
  MessageSquare, 
  Settings, 
  FileText, 
  History, 
  BookOpen,
  Activity,
  Database
} from "lucide-react";
import { useAuth } from "../../context/auth-context";

interface TabItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  requireRole?: 'user' | 'operator' | 'system_admin';
  className?: string;
}

export function Tabs() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useAuth();

  // 権限チェック関数
  const hasPermission = (requireRole?: 'user' | 'operator' | 'system_admin') => {
    if (!user || !requireRole) return true;
    
    const roleHierarchy: Record<string, number> = {
      'user': 1,
      'operator': 2,
      'system_admin': 3
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requireRole] || 999;
    
    return userLevel >= requiredLevel;
  };

  const tabs: TabItem[] = [
    // 全ユーザー共通 - チャット機能
    {
      title: "応急処置サポート",
      path: "/chat",
      icon: <MessageSquare className="mr-2 h-5 w-5 text-blue-600" />,
      requireRole: 'user',
      className: "text-blue-600 font-bold text-lg border border-blue-300 rounded-md bg-blue-50",
    },
    
    // 運用管理者以上 - システム内機能
    {
      title: "履歴管理",
      path: "/history",
      icon: <History className="mr-2 h-4 w-4" />,
      requireRole: 'operator',
    },
    {
      title: "ドキュメント管理",
      path: "/documents",
      icon: <BookOpen className="mr-2 h-4 w-4" />,
      requireRole: 'operator',
    },
    {
      title: "トラブルシューティング",
      path: "/troubleshooting",
      icon: <FileText className="mr-2 h-4 w-4" />,
      requireRole: 'operator',
    },
    {
      title: "基礎データ管理",
      path: "/base-data",
      icon: <Database className="mr-2 h-4 w-4" />,
      requireRole: 'operator',
    },
    {
      title: "システム診断",
      path: "/system-diagnostic",
      icon: <Activity className="mr-2 h-4 w-4" />,
      requireRole: 'operator',
    },
    {
      title: "設定",
      path: "/settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
      requireRole: 'operator',
    },
  ];

  // 権限に応じてタブをフィルタリング
  const filteredTabs = tabs.filter(tab => hasPermission(tab.requireRole));

  return (
    <div className="flex items-center space-x-2">
      {filteredTabs.map((tab) => (
        <Link key={tab.path} to={tab.path}>
          <Button
            variant="ghost"
            className={cn(
              "px-4 py-3 rounded-md",
              currentPath === tab.path
                ? "text-primary font-semibold bg-blue-100"
                : "text-gray-600 hover:bg-gray-100",
              tab.className
            )}
          >
            {tab.icon}
            {tab.title}
          </Button>
        </Link>
      ))}
    </div>
  );
}
