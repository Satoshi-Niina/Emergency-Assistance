import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useChat } from "@/context/chat-context";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs } from "./tabs";

export default function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <header className="bg-primary text-white py-3 px-4 flex items-center justify-between shadow-md">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold mr-6">応急処置チャットシステム</h1>
        <div className="hidden md:flex items-center space-x-1">
          <Tabs />
        </div>
      </div>
      <div className="flex items-center">
        <div className="text-sm">
          ログインユーザー：{user?.display_name || user?.username || 'ゲスト'} 
          {user?.role && ` (${user.role === 'admin' ? '管理者' : '一般ユーザー'})`}
        </div>
        <div className="md:hidden ml-2">
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
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
