import { useState } from "react";
import { useAuth } from "../../context/auth-context";
import { useChat } from "../../context/chat-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Menu, Settings, LogOut, User, LifeBuoy, FileText, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "../../components/ui/sheet";
import { Tabs } from "./tabs";

interface HeaderProps {
  onModelChange?: (model: string) => void;
  onMachineNumberChange?: (machineNumber: string) => void;
}

export default function Header({ onModelChange, onMachineNumberChange }: HeaderProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 追加: 機種と機械番号の状態管琁E
  const [model, setModel] = useState("");
  const [machineNumber, setMachineNumber] = useState("");

  // 追加: 値が変更されたときに親コンポ�Eネントに通知
  const handleModelChange = (value: string) => {
    setModel(value);
    onModelChange?.(value);
  };

  const handleMachineNumberChange = (value: string) => {
    setMachineNumber(value);
    onMachineNumberChange?.(value);
  };

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
    console.log('設定�EタンがクリチE��されました');
    navigate('/settings');
  };

  return (
    <header className="bg-primary text-white py-3 px-4 flex items-center justify-between shadow-md">
      <div className="flex items-center">
        <h1 className="text-sm font-semibold mr-6" style={{ fontSize: '70%' }}>応急処置支援シスチE��</h1>
        <div className="hidden md:flex items-center space-x-1">
          <Tabs />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-xs" style={{ fontSize: '80%' }}>
          ログインユーザー�E�{user?.display_name || user?.username || 'ゲスチE}
        </div>

        {/* 設定�Eタン */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20"
          onClick={handleSettingsClick}
          title="設宁E
        >
          <Settings className="h-6 w-6" />
        </Button>

        {/* ログアウト�Eタン */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20"
          onClick={handleLogout}
          title="ログアウチE
        >
          <LogOut className="h-6 w-6" />
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
                  <button 
                    onClick={() => {
                      handleSettingsClick();
                      setSidebarOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-blue-600"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    設宁E
                  </button>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setSidebarOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウチE
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
