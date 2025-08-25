import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useToast } from "../hooks/use-toast";
import * as XLSX from 'xlsx';

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Shield, UserPlus, ArrowLeft, User, Edit, Trash2, AlertCircle, Search, Upload, Download } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";

// 繝ｦ繝ｼ繧ｶ繝ｼ繧､繝ｳ繧ｿ繝ｼ繝輔ぉ繝ｼ繧ｹ
interface UserData {
  id: string;
  username: string;
  display_name: string;
  role: "employee" | "admin";
  department?: string;
  description?: string;
}

// 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ菴懈・逕ｨ繧､繝ｳ繧ｿ繝ｼ繝輔ぉ繝ｼ繧ｹ
interface NewUserData {
  username: string;
  password: string;
  display_name: string;
  role: "employee" | "admin";
  department?: string;
  description?: string;
}

export default function UsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<Error | null>(null);

  // 繝ｦ繝ｼ繧ｶ繝ｼ縺梧悴隱崎ｨｼ縺ｾ縺溘・admin莉･螟悶・蝣ｴ蜷医・繝ｪ繝繧､繝ｬ繧ｯ繝・
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/chat");
    }
  }, [user, authLoading, navigate]);

  // 繝ｦ繝ｼ繧ｶ繝ｼ繝・・繧ｿ縺ｮ蜿門ｾ暦ｼ育ｰ｡邏蛹也沿・・
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [queryError, setQueryError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('剥 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ鈴幕蟋・);
        console.log('剥 迴ｾ蝨ｨ縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ:', user);
        console.log('剥 繧ｻ繝・す繝ｧ繝ｳ迥ｶ諷・', document.cookie);
        console.log('剥 迴ｾ蝨ｨ縺ｮURL:', window.location.href);
        
        setIsLoading(true);
        setQueryError(null);
        
        const res = await fetch('/api/users', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('剥 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ励Ξ繧ｹ繝昴Φ繧ｹ:', {
          status: res.status,
          ok: res.ok,
          headers: Object.fromEntries(res.headers.entries())
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('笶・繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        
        const userData = await res.json();
        console.log('剥 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ繝・・繧ｿ:', userData);
        
        if (userData.success && userData.data) {
          setUsers(userData.data);
          setFilteredUsers(userData.data);
        } else {
          console.error('笶・莠域悄縺励↑縺・Θ繝ｼ繧ｶ繝ｼ繝・・繧ｿ蠖｢蠑・', userData);
          throw new Error("繝ｦ繝ｼ繧ｶ繝ｼ繝・・繧ｿ縺ｮ蠖｢蠑上′荳肴ｭ｣縺ｧ縺・);
        }
      } catch (error) {
        console.error('笶・繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
        setQueryError(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // 讀懃ｴ｢讖溯・
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => {
      const query = searchQuery.toLowerCase();
      
      // 繝ｯ繧､繝ｫ繝峨き繝ｼ繝画､懃ｴ｢縺ｮ蜃ｦ逅・
      if (query.includes('*')) {
        const pattern = query.replace(/\*/g, '.*');
        const regex = new RegExp(pattern, 'i');
        
        return (
          regex.test(user.username) ||
          regex.test(user.display_name) ||
          regex.test(user.role) ||
          (user.department && regex.test(user.department)) ||
          (user.description && regex.test(user.description))
        );
      }
      
      // 騾壼ｸｸ縺ｮ驛ｨ蛻・ｸ閾ｴ讀懃ｴ｢
      return (
        user.username.toLowerCase().includes(query) ||
        user.display_name.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query) ||
        (user.department && user.department.toLowerCase().includes(query)) ||
        (user.description && user.description.toLowerCase().includes(query))
      );
    });
    
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // 繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ縺ｮ霑ｽ蜉
  useEffect(() => {
    if (queryError) {
      console.error('繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ隧ｳ邏ｰ:', queryError);
      
      let errorMessage = "繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆";
      if (queryError instanceof Error) {
        errorMessage = queryError.message;
      }
      
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [queryError, toast]);

  // 隱崎ｨｼ繧ｨ繝ｩ繝ｼ繧・ｨｩ髯舌お繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・陦ｨ遉ｺ
  if (queryError instanceof Error) {
    if (queryError.message.includes('隱崎ｨｼ縺悟ｿ・ｦ・) || queryError.message.includes('邂｡逅・・ｨｩ髯・)) {
      return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Shield className="mr-2 h-6 w-6" />
                繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・
              </h1>
              <p className="text-neutral-300">繧ｷ繧ｹ繝・Β縺ｮ蜈ｨ繝ｦ繝ｼ繧ｶ繝ｼ繧堤ｮ｡逅・＠縺ｾ縺・/p>
            </div>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                險ｭ螳壹↓謌ｻ繧・
              </Button>
            </Link>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">繧｢繧ｯ繧ｻ繧ｹ讓ｩ髯舌′縺ゅｊ縺ｾ縺帙ｓ</h3>
                <p className="text-gray-600 mb-4">
                  {queryError.message.includes('隱崎ｨｼ縺悟ｿ・ｦ・) 
                    ? "繝ｭ繧ｰ繧､繝ｳ縺悟ｿ・ｦ√〒縺吶ょ・蠎ｦ繝ｭ繧ｰ繧､繝ｳ縺励※縺上□縺輔＞縲・ 
                    : "縺薙・繝壹・繧ｸ縺ｫ繧｢繧ｯ繧ｻ繧ｹ縺吶ｋ縺ｫ縺ｯ邂｡逅・・ｨｩ髯舌′蠢・ｦ√〒縺吶・}
                </p>
                <Link to="/chat">
                  <Button>
                    繝√Ε繝・ヨ縺ｫ謌ｻ繧・
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ繝輔か繝ｼ繝
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [newUser, setNewUser] = useState<Partial<NewUserData>>({
    username: "",
    password: "",
    display_name: "",
    role: "employee",
    department: "",
    description: "",
  });
  const [editUser, setEditUser] = useState<Partial<UserData & { password?: string; description?: string }>>({
    id: "",
    username: "",
    display_name: "",
    role: "employee",
    password: "",
    description: "",
  });

  // 繝輔か繝ｼ繝縺ｮ蛟､繧偵Μ繧ｻ繝・ヨ
  const resetNewUserForm = () => {
    setNewUser({
      username: "",
      password: "",
      display_name: "",
      role: "employee",
      department: "",
      description: "",
    });
  };



  // 繝輔か繝ｼ繝騾∽ｿ｡蜃ｦ逅・
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!newUser.username || !newUser.password || !newUser.display_name || !newUser.role) {
      toast({
        title: "蜈･蜉帙お繝ｩ繝ｼ",
        description: "繝ｦ繝ｼ繧ｶ繝ｼ蜷阪√ヱ繧ｹ繝ｯ繝ｼ繝峨∬｡ｨ遉ｺ蜷阪∵ｨｩ髯舌・蠢・磯・岼縺ｧ縺・,
        variant: "destructive",
      });
      return;
    }

    // 繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・蠖｢蠑上メ繧ｧ繝・け
    if (newUser.username.length < 3 || newUser.username.length > 50) {
      toast({
        title: "蜈･蜉帙お繝ｩ繝ｼ",
        description: "繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・3譁・ｭ嶺ｻ･荳・0譁・ｭ嶺ｻ･荳九〒蜈･蜉帙＠縺ｦ縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }

    // 繝代せ繝ｯ繝ｼ繝峨・蠑ｷ蠎ｦ繝√ぉ繝・け
    if (newUser.password.length < 8) {
      toast({
        title: "繝代せ繝ｯ繝ｼ繝峨お繝ｩ繝ｼ",
        description: "繝代せ繝ｯ繝ｼ繝峨・8譁・ｭ嶺ｻ･荳翫〒險ｭ螳壹＠縺ｦ縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }
    
    const hasUpperCase = /[A-Z]/.test(newUser.password);
    const hasLowerCase = /[a-z]/.test(newUser.password);
    const hasNumbers = /\d/.test(newUser.password);
    const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newUser.password);
    
    if (!hasUpperCase) {
      toast({
        title: "繝代せ繝ｯ繝ｼ繝峨お繝ｩ繝ｼ",
        description: "繝代せ繝ｯ繝ｼ繝峨↓縺ｯ螟ｧ譁・ｭ励ｒ1譁・ｭ嶺ｻ･荳雁性繧√※縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasLowerCase) {
      toast({
        title: "繝代せ繝ｯ繝ｼ繝峨お繝ｩ繝ｼ",
        description: "繝代せ繝ｯ繝ｼ繝峨↓縺ｯ蟆乗枚蟄励ｒ1譁・ｭ嶺ｻ･荳雁性繧√※縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasNumbers) {
      toast({
        title: "繝代せ繝ｯ繝ｼ繝峨お繝ｩ繝ｼ",
        description: "繝代せ繝ｯ繝ｼ繝峨↓縺ｯ謨ｰ蟄励ｒ1譁・ｭ嶺ｻ･荳雁性繧√※縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasSymbols) {
      toast({
        title: "繝代せ繝ｯ繝ｼ繝峨お繝ｩ繝ｼ",
        description: "繝代せ繝ｯ繝ｼ繝峨↓縺ｯ險伜捷繧・譁・ｭ嶺ｻ･荳雁性繧√※縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }

    // 陦ｨ遉ｺ蜷阪・蠖｢蠑上メ繧ｧ繝・け
    if (newUser.display_name.length < 1 || newUser.display_name.length > 100) {
      toast({
        title: "蜈･蜉帙お繝ｩ繝ｼ",
        description: "陦ｨ遉ｺ蜷阪・1譁・ｭ嶺ｻ･荳・00譁・ｭ嶺ｻ･荳九〒蜈･蜉帙＠縺ｦ縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }

    // 讓ｩ髯舌・蛟､繝√ぉ繝・け
    if (!['employee', 'admin'].includes(newUser.role || '')) {
      toast({
        title: "蜈･蜉帙お繝ｩ繝ｼ",
        description: "讓ｩ髯舌・縲御ｸ闊ｬ繝ｦ繝ｼ繧ｶ繝ｼ縲阪∪縺溘・縲檎ｮ｡逅・・阪ｒ驕ｸ謚槭＠縺ｦ縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('剥 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ菴懈・髢句ｧ・', newUser);
      
      const res = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          display_name: newUser.display_name,
          role: newUser.role || 'employee',
          department: newUser.department || undefined,
          description: newUser.description || undefined
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`繝ｦ繝ｼ繧ｶ繝ｼ菴懈・螟ｱ謨・ ${errorText}`);
      }
      
      const result = await res.json();
      console.log('剥 繝ｦ繝ｼ繧ｶ繝ｼ菴懈・邨先棡:', result);
      
      if (result.success) {
        console.log('笨・繝ｦ繝ｼ繧ｶ繝ｼ菴懈・謌仙粥:', result.data);
        toast({
          title: "謌仙粥",
          description: "繝ｦ繝ｼ繧ｶ繝ｼ縺梧ｭ｣蟶ｸ縺ｫ菴懈・縺輔ｌ縺ｾ縺励◆",
        });
        setShowNewUserDialog(false);
        resetNewUserForm();
        
        // 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ繧貞・蜿門ｾ・
        const fetchUsers = async () => {
          try {
            const res = await fetch('/api/users', {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (res.ok) {
              const userData = await res.json();
              if (userData.success && userData.data) {
                setUsers(userData.data);
                setFilteredUsers(userData.data); // 讀懃ｴ｢邨先棡繧よ峩譁ｰ
              }
            }
          } catch (error) {
            console.error('繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜀榊叙蠕励お繝ｩ繝ｼ:', error);
          }
        };
        
        fetchUsers();
      } else {
        throw new Error(result.error || '繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }
    } catch (error) {
      console.error('笶・繝ｦ繝ｼ繧ｶ繝ｼ菴懈・繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  // 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝画峩譁ｰ蜃ｦ逅・
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  // 繧ｻ繝ｬ繧ｯ繝域峩譁ｰ蜃ｦ逅・
  const handleSelectChange = (name: string, value: string) => {
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  // 邱ｨ髮・畑繧ｻ繝ｬ繧ｯ繝域峩譁ｰ蜃ｦ逅・
  const handleEditSelectChange = (name: string, value: string) => {
    setEditUser((prev) => ({ ...prev, [name]: value }));
  };

  // 繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ驕ｸ謚槫・逅・
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 繝輔ぃ繧､繝ｫ蠖｢蠑上メ繧ｧ繝・け
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      const validExtensions = ['.xlsx', '.xls'];
      
      const isValidType = validTypes.includes(file.type) || 
                         validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (!isValidType) {
        toast({
          title: "繝輔ぃ繧､繝ｫ蠖｢蠑上お繝ｩ繝ｼ",
          description: "繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ・・xlsx, .xls・峨・縺ｿ繧｢繝・・繝ｭ繝ｼ繝牙庄閭ｽ縺ｧ縺・,
          variant: "destructive",
        });
        return;
      }
      
      setImportFile(file);
    }
  };

  // 繧ｨ繧ｯ繧ｻ繝ｫ繧､繝ｳ繝昴・繝亥・逅・
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!importFile) {
      toast({
        title: "繝輔ぃ繧､繝ｫ繧ｨ繝ｩ繝ｼ",
        description: "繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/users/import-excel', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await res.json();

      if (result.success) {
        setImportResults(result.results);
        toast({
          title: "繧､繝ｳ繝昴・繝亥ｮ御ｺ・,
          description: `謌仙粥: ${result.results.success}莉ｶ, 螟ｱ謨・ ${result.results.failed}莉ｶ`,
        });
        
        // 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ繧貞・蜿門ｾ・
        const fetchUsers = async () => {
          try {
            const res = await fetch('/api/users', {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (res.ok) {
              const userData = await res.json();
              if (userData.success && userData.data) {
                setUsers(userData.data);
                setFilteredUsers(userData.data);
              }
            }
          } catch (error) {
            console.error('繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜀榊叙蠕励お繝ｩ繝ｼ:', error);
          }
        };
        
        fetchUsers();
      } else {
        throw new Error(result.error || '繧､繝ｳ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆');
      }
    } catch (error) {
      console.error('繧ｨ繧ｯ繧ｻ繝ｫ繧､繝ｳ繝昴・繝医お繝ｩ繝ｼ:', error);
      toast({
        title: "繧､繝ｳ繝昴・繝医お繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繧､繝ｳ繝昴・繝井ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // 繧ｨ繧ｯ繧ｻ繝ｫ繝・Φ繝励Ξ繝ｼ繝医ム繧ｦ繝ｳ繝ｭ繝ｼ繝・
  const handleDownloadTemplate = () => {
    const templateData = [
      ['username', 'password', 'display_name', 'role', 'department', 'description'],
      ['user1', 'Password123!', '繝ｦ繝ｼ繧ｶ繝ｼ1', 'employee', '蝟ｶ讌ｭ驛ｨ', '荳闊ｬ繝ｦ繝ｼ繧ｶ繝ｼ'],
      ['admin1', 'Admin123!', '邂｡逅・・', 'admin', '邂｡逅・Κ', '繧ｷ繧ｹ繝・Β邂｡逅・・],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    
    XLSX.writeFile(wb, 'user_import_template.xlsx');
  };

  // 邱ｨ髮・畑蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝画峩譁ｰ蜃ｦ逅・
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditUser((prev) => ({ ...prev, [name]: value }));
  };

  // 繝ｦ繝ｼ繧ｶ繝ｼ邱ｨ髮・ｺ門ｙ
  const handleEditUser = (userData: UserData) => {
    setSelectedUserId(userData.id);
    setEditUser({
      id: userData.id, // ID繧定ｿｽ蜉
      username: userData.username,
      display_name: userData.display_name,
      role: userData.role,
      department: userData.department,
      description: userData.description,
      password: "" // 繝代せ繝ｯ繝ｼ繝峨ヵ繧｣繝ｼ繝ｫ繝峨ｒ遨ｺ縺ｧ蛻晄悄蛹・
    });
    setShowEditUserDialog(true);
  };

  // 繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁貅門ｙ
  const handleDeleteUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowDeleteConfirmDialog(true);
  };

  // 繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁螳溯｡・
  const handleDeleteConfirm = async () => {
    if (!selectedUserId) return;
    
    try {
      // 閾ｪ蛻・・霄ｫ縺ｮ繧｢繧ｫ繧ｦ繝ｳ繝医・蜑企勁縺ｧ縺阪↑縺・メ繧ｧ繝・け
      if (user && selectedUserId === user.id) {
        toast({
          title: "蜑企勁繧ｨ繝ｩ繝ｼ",
          description: "閾ｪ蛻・・霄ｫ縺ｮ繧｢繧ｫ繧ｦ繝ｳ繝医・蜑企勁縺ｧ縺阪∪縺帙ｓ",
          variant: "destructive",
        });
        setShowDeleteConfirmDialog(false);
        return;
      }

      const res = await fetch(`/api/users/${selectedUserId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `HTTP ${res.status}: 繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆`);
      }

      const result = await res.json();
      console.log('繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁邨先棡:', result);
      
      toast({
        title: "蜑企勁螳御ｺ・,
        description: "繝ｦ繝ｼ繧ｶ繝ｼ縺悟炎髯､縺輔ｌ縺ｾ縺励◆",
      });
      
      setShowDeleteConfirmDialog(false);
      
      // 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ繧貞・蜿門ｾ・
      const fetchUsers = async () => {
        try {
          const res = await fetch('/api/users', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (res.ok) {
            const userData = await res.json();
            if (userData.success && userData.data) {
              setUsers(userData.data);
              setFilteredUsers(userData.data); // 讀懃ｴ｢邨先棡繧よ峩譁ｰ
            }
          }
        } catch (error) {
          console.error('繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜀榊叙蠕励お繝ｩ繝ｼ:', error);
        }
      };
      
      fetchUsers();
      
    } catch (error) {
      console.error('繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: "蜑企勁螟ｱ謨・,
        description: error instanceof Error ? error.message : "繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
      setShowDeleteConfirmDialog(false);
    }
  };

  // 邱ｨ髮・ヵ繧ｩ繝ｼ繝騾∽ｿ｡蜃ｦ逅・
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!editUser.username || !editUser.display_name) {
      toast({
        title: "蜈･蜉帙お繝ｩ繝ｼ",
        description: "蠢・磯・岼繧貞・蜉帙＠縺ｦ縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }

    try {
      // 遨ｺ縺ｮ繝代せ繝ｯ繝ｼ繝峨ヵ繧｣繝ｼ繝ｫ繝峨ｒ髯､蜴ｻ縺励※騾∽ｿ｡
      const sanitizedEditUser = { ...editUser };
      
      // 繝代せ繝ｯ繝ｼ繝峨′遨ｺ縲「ndefined縲］ull縲∫ｩｺ逋ｽ譁・ｭ励・蝣ｴ蜷医・螳悟・縺ｫ髯､蜴ｻ
      if (!sanitizedEditUser.password || 
          typeof sanitizedEditUser.password !== 'string' || 
          sanitizedEditUser.password.trim().length === 0) {
        delete sanitizedEditUser.password;
        console.log('遨ｺ縺ｮ繝代せ繝ｯ繝ｼ繝峨ヵ繧｣繝ｼ繝ｫ繝峨ｒ髯､蜴ｻ縺励∪縺励◆');
      } else {
        console.log('繝代せ繝ｯ繝ｼ繝峨ヵ繧｣繝ｼ繝ｫ繝峨ｒ騾∽ｿ｡縺励∪縺・);
      }
      
      console.log('騾∽ｿ｡縺吶ｋ繝ｦ繝ｼ繧ｶ繝ｼ繝・・繧ｿ:', { 
        ...sanitizedEditUser, 
        password: sanitizedEditUser.password ? '[SET]' : '[NOT_SET]' 
      });
      
      console.log('API URL:', `/api/users/${editUser.id}`);
      console.log('繝ｪ繧ｯ繧ｨ繧ｹ繝医・繝・ぅ:', JSON.stringify(sanitizedEditUser, null, 2));
      
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedEditUser)
      });
      
      console.log('繝ｬ繧ｹ繝昴Φ繧ｹ繧ｹ繝・・繧ｿ繧ｹ:', res.status);
      console.log('繝ｬ繧ｹ繝昴Φ繧ｹ繝倥ャ繝繝ｼ:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ:', errorText);
        console.error('繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ隧ｳ邏ｰ:', {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          body: errorText
        });
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const result = await res.json();
      console.log('繝ｦ繝ｼ繧ｶ繝ｼ譖ｴ譁ｰ邨先棡:', result);
      
      toast({
        title: "謌仙粥",
        description: "繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧呈峩譁ｰ縺励∪縺励◆",
      });
      
      // 繝繧､繧｢繝ｭ繧ｰ繧帝哩縺倥※繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ繧貞・蜿門ｾ・
      setShowEditUserDialog(false);
      setEditUser({
        id: '',
        username: '',
        display_name: '',
        role: 'employee',
        department: '',
        description: '',
        password: ''
      });
      
      // 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ繧貞・蜿門ｾ・
      const fetchUsers = async () => {
        try {
          const res = await fetch('/api/users', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (res.ok) {
            const userData = await res.json();
            if (userData.success && userData.data) {
              setUsers(userData.data);
              setFilteredUsers(userData.data); // 讀懃ｴ｢邨先棡繧よ峩譁ｰ
            }
          }
        } catch (error) {
          console.error('繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ蜀榊叙蠕励お繝ｩ繝ｼ:', error);
        }
      };
      
      fetchUsers();
      
    } catch (error) {
      console.error('繝ｦ繝ｼ繧ｶ繝ｼ譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繝ｦ繝ｼ繧ｶ繝ｼ譖ｴ譁ｰ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  // 邂｡逅・・〒縺ｪ縺・ｴ蜷医・繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ陦ｨ遉ｺ
  if (!user || (user && user.role !== "admin")) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Shield className="mr-2 h-6 w-6" />
            繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・
          </h1>
          <p className="text-neutral-300">繧ｷ繧ｹ繝・Β縺ｮ蜈ｨ繝ｦ繝ｼ繧ｶ繝ｼ繧堤ｮ｡逅・＠縺ｾ縺・/p>
        </div>

        <div className="flex space-x-2">
          <Link to="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              險ｭ螳壹↓謌ｻ繧・
            </Button>
          </Link>
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                繧ｨ繧ｯ繧ｻ繝ｫ繧､繝ｳ繝昴・繝・
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ菴懈・
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ菴懈・</DialogTitle>
                <DialogDescription>
                  譁ｰ縺励＞繝ｦ繝ｼ繧ｶ繝ｼ繧｢繧ｫ繧ｦ繝ｳ繝医ｒ菴懈・縺励∪縺吶・
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">繝ｦ繝ｼ繧ｶ繝ｼ蜷・/Label>
                    <Input
                      id="username"
                      name="username"
                      value={newUser.username}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">繝代せ繝ｯ繝ｼ繝・/Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={newUser.password}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-sm text-gray-500">
                      繝代せ繝ｯ繝ｼ繝峨・8譁・ｭ嶺ｻ･荳翫〒縲∝､ｧ譁・ｭ励・蟆乗枚蟄励・謨ｰ蟄励・險伜捷繧偵◎繧後◇繧・譁・ｭ嶺ｻ･荳雁性繧√※縺上□縺輔＞
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="display_name">陦ｨ遉ｺ蜷・/Label>
                    <Input
                      id="display_name"
                      name="display_name"
                      value={newUser.display_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="department">驛ｨ鄂ｲ</Label>
                    <Input
                      id="department"
                      name="department"
                      value={newUser.department || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">隱ｬ譏・/Label>
                    <Input
                      id="description"
                      name="description"
                      value={newUser.description || ""}
                      onChange={handleInputChange}
                      placeholder="繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ隱ｬ譏趣ｼ井ｻｻ諢擾ｼ・
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="role">讓ｩ髯・/Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => handleSelectChange("role", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="讓ｩ髯舌ｒ驕ｸ謚・ />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">荳闊ｬ繝ｦ繝ｼ繧ｶ繝ｼ</SelectItem>
                        <SelectItem value="admin">邂｡逅・・/SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewUserDialog(false)}
                  >
                    繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                  </Button>
                  <Button 
                    type="submit"
                  >
                    菴懈・
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <User className="mr-2 h-5 w-5" />
              繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="繝ｦ繝ｼ繧ｶ繝ｼ讀懃ｴ｢・・縺ｧ繝ｯ繧､繝ｫ繝峨き繝ｼ繝会ｼ・
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                >
                  繧ｯ繝ｪ繧｢
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>繝ｦ繝ｼ繧ｶ繝ｼ蜷・/TableHead>
                    <TableHead>陦ｨ遉ｺ蜷・/TableHead>
                    <TableHead>讓ｩ髯・/TableHead>
                    <TableHead>驛ｨ鄂ｲ</TableHead>
                    <TableHead>隱ｬ譏・/TableHead>
                    <TableHead className="text-right">繧｢繧ｯ繧ｷ繝ｧ繝ｳ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers && filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.display_name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === "admin" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {user.role === "admin" ? "邂｡逅・・ : "荳闊ｬ繝ｦ繝ｼ繧ｶ繝ｼ"}
                          </span>
                        </TableCell>
                        <TableCell>{user.department || "-"}</TableCell>
                        <TableCell>{user.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        {searchQuery ? "讀懃ｴ｢譚｡莉ｶ縺ｫ荳閾ｴ縺吶ｋ繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ" : "繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {searchQuery && (
                <div className="mt-4 text-sm text-gray-500">
                  讀懃ｴ｢邨先棡: {filteredUsers.length}莉ｶ / 蜈ｨ{users.length}莉ｶ
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 繝ｦ繝ｼ繧ｶ繝ｼ邱ｨ髮・ム繧､繧｢繝ｭ繧ｰ */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>繝ｦ繝ｼ繧ｶ繝ｼ邱ｨ髮・/DialogTitle>
            <DialogDescription>
              繝ｦ繝ｼ繧ｶ繝ｼ繧｢繧ｫ繧ｦ繝ｳ繝域ュ蝣ｱ繧堤ｷｨ髮・＠縺ｾ縺吶・
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-username">繝ｦ繝ｼ繧ｶ繝ｼ蜷・/Label>
                <Input
                  id="edit-username"
                  name="username"
                  value={editUser.username}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-display_name">陦ｨ遉ｺ蜷・/Label>
                <Input
                  id="edit-display_name"
                  name="display_name"
                  value={editUser.display_name}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-password">譁ｰ縺励＞繝代せ繝ｯ繝ｼ繝会ｼ亥､画峩縺吶ｋ蝣ｴ蜷医・縺ｿ・・/Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  value={editUser.password || ""}
                  onChange={handleEditInputChange}
                  placeholder="繝代せ繝ｯ繝ｼ繝峨ｒ螟画峩縺励↑縺・ｴ蜷医・遨ｺ谺・・縺ｾ縺ｾ"
                />
                 <p className="text-sm text-gray-500 mt-1">
                    窶ｻ繝代せ繝ｯ繝ｼ繝峨ｒ螟画峩縺励↑縺・ｴ蜷医・遨ｺ縺ｮ縺ｾ縺ｾ縺ｫ縺励※縺上□縺輔＞
                  </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-department">驛ｨ鄂ｲ</Label>
                <Input
                  id="edit-department"
                  name="department"
                  value={editUser.department || ""}
                  onChange={handleEditInputChange}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description">隱ｬ譏・/Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={editUser.description || ""}
                  onChange={handleEditInputChange}
                  placeholder="繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ隱ｬ譏趣ｼ井ｻｻ諢擾ｼ・
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-role">讓ｩ髯・/Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => handleEditSelectChange("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="讓ｩ髯舌ｒ驕ｸ謚・ />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">荳闊ｬ繝ｦ繝ｼ繧ｶ繝ｼ</SelectItem>
                    <SelectItem value="admin">邂｡逅・・/SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditUserDialog(false)}
              >
                繧ｭ繝｣繝ｳ繧ｻ繝ｫ
              </Button>
              <Button 
                type="submit"
              >
                譖ｴ譁ｰ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              繝ｦ繝ｼ繧ｶ繝ｼ蜑企勁縺ｮ遒ｺ隱・
            </DialogTitle>
            <DialogDescription>
              縺薙・繝ｦ繝ｼ繧ｶ繝ｼ繧貞炎髯､縺吶ｋ縺ｨ縲・未騾｣縺吶ｋ縺吶∋縺ｦ縺ｮ繝・・繧ｿ縺悟炎髯､縺輔ｌ縺ｾ縺吶ゅ％縺ｮ謫堺ｽ懊・蜈・↓謌ｻ縺帙∪縺帙ｓ縲・
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <p className="text-center font-medium">譛ｬ蠖薙↓縺薙・繝ｦ繝ｼ繧ｶ繝ｼ繧貞炎髯､縺励∪縺吶°・・/p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              <p className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>豕ｨ諢・</strong> 繝√Ε繝・ヨ縲√Γ繝・そ繝ｼ繧ｸ縲√ラ繧ｭ繝･繝｡繝ｳ繝医↑縺ｩ縲√％縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ縺ｫ髢｢騾｣縺吶ｋ縺吶∋縺ｦ縺ｮ繝・・繧ｿ縺悟炎髯､縺輔ｌ縺ｾ縺吶・
                  繝ｦ繝ｼ繧ｶ繝ｼ縺後メ繝｣繝・ヨ繧・ラ繧ｭ繝･繝｡繝ｳ繝医ｒ謖√▲縺ｦ縺・ｋ蝣ｴ蜷医√◎繧後ｉ繧ょ酔譎ゅ↓蜑企勁縺輔ｌ縺ｾ縺吶・
                </span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirmDialog(false)}
            >
              繧ｭ繝｣繝ｳ繧ｻ繝ｫ
            </Button>
            <Button 
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              蜑企勁
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 繧ｨ繧ｯ繧ｻ繝ｫ繧､繝ｳ繝昴・繝医ム繧､繧｢繝ｭ繧ｰ */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ荳諡ｬ繧､繝ｳ繝昴・繝・
            </DialogTitle>
            <DialogDescription>
              繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ繧剃ｸ諡ｬ縺ｧ繧､繝ｳ繝昴・繝医＠縺ｾ縺吶・
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 繝・Φ繝励Ξ繝ｼ繝医ム繧ｦ繝ｳ繝ｭ繝ｼ繝・*/}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">繝・Φ繝励Ξ繝ｼ繝医ヵ繧｡繧､繝ｫ</h4>
              <p className="text-sm text-blue-700 mb-3">
                繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ縺ｮ蠖｢蠑上↓蜷医ｏ縺帙※繝・Φ繝励Ξ繝ｼ繝医ｒ繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｦ縺上□縺輔＞縲・
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Download className="mr-2 h-4 w-4" />
                繝・Φ繝励Ξ繝ｼ繝医ｒ繝繧ｦ繝ｳ繝ｭ繝ｼ繝・
              </Button>
            </div>

            {/* 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝・*/}
            <form onSubmit={handleImportSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="excel-file">繧ｨ繧ｯ繧ｻ繝ｫ繝輔ぃ繧､繝ｫ繧帝∈謚・/Label>
                  <Input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    蟇ｾ蠢懷ｽ｢蠑・ .xlsx, .xls・域怙螟ｧ5MB・・
                  </p>
                </div>

                {importFile && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-700">
                      驕ｸ謚槭＆繧後◆繝輔ぃ繧､繝ｫ: {importFile.name} ({(importFile.size / 1024 / 1024).toFixed(2)}MB)
                    </p>
                  </div>
                )}

                {/* 繧､繝ｳ繝昴・繝育ｵ先棡陦ｨ遉ｺ */}
                {importResults && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h4 className="font-medium mb-2">繧､繝ｳ繝昴・繝育ｵ先棡</h4>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-green-600 font-medium">謌仙粥: {importResults.success}莉ｶ</span>
                        {importResults.failed > 0 && (
                          <span className="text-red-600 font-medium ml-4">螟ｱ謨・ {importResults.failed}莉ｶ</span>
                        )}
                      </p>
                      
                      {importResults.errors && importResults.errors.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-red-600 mb-2">繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ:</p>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {importResults.errors.map((error: string, index: number) => (
                              <p key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                {error}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowImportDialog(false);
                      setImportFile(null);
                      setImportResults(null);
                    }}
                  >
                    繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                  </Button>
                  <Button 
                    type="submit"
                    disabled={!importFile || isImporting}
                  >
                    {isImporting ? "繧､繝ｳ繝昴・繝井ｸｭ..." : "繧､繝ｳ繝昴・繝亥ｮ溯｡・}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}