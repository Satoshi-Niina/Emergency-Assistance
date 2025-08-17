import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Tabs as TabsPrimitive, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { MessageSquare, Database, Settings, FileText, History, Wrench } from "lucide-react";
import { useAuth } from "../../context/auth-context";

interface TabItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  className?: string;
}

export function Tabs() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useAuth();

  // 管理者判定を無効化（全タブ表示）
  const isAdmin = true;

  const tabs: TabItem[] = [
    {
      title: "応急処置サポート",
      path: "/chat",
      icon: <MessageSquare className="mr-2 h-5 w-5 text-blue-600" />,
      className: "text-blue-600 font-bold text-lg border border-blue-300 rounded-md bg-blue-50",
    },
    {
      title: "履歴管理",
      path: "/history",
      icon: <History className="mr-2 h-4 w-4" />,
    },
    {
      title: "基礎データ管理",
      path: "/base-data",
      icon: <Wrench className="mr-2 h-4 w-4" />,
      adminOnly: false,
    },
    {
      title: "応急処置データ管理",
      path: "/troubleshooting",
      icon: <FileText className="mr-2 h-4 w-4" />,
      adminOnly: true,
    },
    {
      title: "設定",
      path: "/settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
    },

  ];

  const filteredTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

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
