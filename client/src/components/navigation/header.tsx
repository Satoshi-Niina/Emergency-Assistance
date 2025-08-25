﻿import { useState } from "react";
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
  
  // 霑ｽ蜉: 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ縺ｮ迥ｶ諷狗ｮ｡逅・
  const [model, setModel] = useState("");
  const [machineNumber, setMachineNumber] = useState("");

  // 霑ｽ蜉: 蛟､縺悟､画峩縺輔ｌ縺溘→縺阪↓隕ｪ繧ｳ繝ｳ繝昴・繝阪Φ繝医↓騾夂衍
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
      console.error('繝ｭ繧ｰ繧｢繧ｦ繝医お繝ｩ繝ｼ:', error);
    }
  };

  const handleSettingsClick = () => {
    console.log('險ｭ螳壹・繧ｿ繝ｳ縺後け繝ｪ繝・け縺輔ｌ縺ｾ縺励◆');
    navigate('/settings');
  };

  return (
    <header className="bg-primary text-white py-3 px-4 flex items-center justify-between shadow-md">
      <div className="flex items-center">
        <h1 className="text-sm font-semibold mr-6" style={{ fontSize: '70%' }}>蠢懈･蜃ｦ鄂ｮ謾ｯ謠ｴ繧ｷ繧ｹ繝・Β</h1>
        <div className="hidden md:flex items-center space-x-1">
          <Tabs />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-xs" style={{ fontSize: '80%' }}>
          繝ｭ繧ｰ繧､繝ｳ繝ｦ繝ｼ繧ｶ繝ｼ・嘴user?.display_name || user?.username || '繧ｲ繧ｹ繝・}
        </div>

        {/* 險ｭ螳壹・繧ｿ繝ｳ */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20"
          onClick={handleSettingsClick}
          title="險ｭ螳・
        >
          <Settings className="h-6 w-6" />
        </Button>

        {/* 繝ｭ繧ｰ繧｢繧ｦ繝医・繧ｿ繝ｳ */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20"
          onClick={handleLogout}
          title="繝ｭ繧ｰ繧｢繧ｦ繝・
        >
          <LogOut className="h-6 w-6" />
        </Button>

        {/* 繝｢繝舌う繝ｫ繝｡繝九Η繝ｼ */}
        <div className="md:hidden">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <div className="bg-primary text-white p-4">
                <h2 className="text-xl font-semibold">繝｡繝九Η繝ｼ</h2>
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
                    險ｭ螳・
                  </button>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setSidebarOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    繝ｭ繧ｰ繧｢繧ｦ繝・
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