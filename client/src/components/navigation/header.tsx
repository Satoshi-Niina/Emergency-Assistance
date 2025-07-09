import { useState } from "react";
import { useAuth } from "../../context/auth-context";
import { useChat } from "../../context/chat-context";
import { Button } from "../../components/ui/button";
import { Menu, Settings, LogOut, User, LifeBuoy, FileText, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "../../components/ui/sheet";
import { Tabs } from "./tabs";

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleSettingsClick = () => {
    console.log('設定ボタンがクリックされました');
    navigate('/settings');
  };

  return (
    <header className="bg-primary text-white py-3 px-4 flex items-center justify-between shadow-md">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold mr-6">応急処置チャットシステム</h1>
        <div className="hidden md:flex items-center space-x-1">
          <Tabs />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-sm">
          ログインユーザー：{user?.display_name || user?.username || 'ゲスト'} 
          {user?.role && ` (${user?.role === 'admin' ? '管理者' : '一般ユーザー'})`}
        </div>
        
        {/* 設定ボタン - 直接リンク */}
        <Link to="/settings" className="text-white hover:bg-white/20 p-2 rounded">
          <Settings className="h-5 w-5" />
        </Link>

        {/* ログアウトボタン */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20"
          onClick={handleLogout}
          title="ログアウト"
        >
          <LogOut className="h-5 w-5" />
        </Button>

        {/* モバイルメニュー */}
        <div className="md:hidden">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <div className="bg-primary text-white p-4">
                <h2 className="text-xl font-semibold">メニュー</h2>
              </div>
              <nav className="p-4">
                <Tabs />
                <div className="mt-4 pt-4 border-t">
                  <Link 
                    to="/settings"
                    className="flex items-center w-full px-3 py-2 text-sm rounded-md hover:bg-gray-100"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    設定
                  </Link>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setSidebarOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
