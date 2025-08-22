import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useToast } from "../hooks/use-toast";
import * as XLSX from 'xlsx';
import { USER_API, API_REQUEST_OPTIONS } from "../lib/api/config";

// API URL構築�Eルパ�E関数
const buildApiUrl = (endpoint: string): string => {
  const isAzureStaticWebApp = window.location.hostname.includes('azurestaticapps.net');
  const apiBaseUrl = isAzureStaticWebApp 
    ? 'https://emergency-backend-api-v2.azurewebsites.net'
    : (import.meta.env.VITE_API_BASE_URL || '');
  
  return `${apiBaseUrl}${endpoint}`;
};

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

// ユーザーインターフェース
interface UserData {
  id: string;
  username: string;
  display_name: string;
  role: "employee" | "admin";
  department?: string;
  description?: string;
}

// 新規ユーザー作�E用インターフェース
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

  // ユーザーが未認証また�Eadmin以外�E場合�EリダイレクチE
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/chat");
    }
  }, [user, authLoading, navigate]);

  // ユーザーチE�Eタの取得（簡素化版�E�E
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [queryError, setQueryError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('🔍 ユーザー一覧取得開姁E);
        console.log('🔍 現在のユーザー:', user);
        console.log('🔍 セチE��ョン状慁E', document.cookie);
        console.log('🔍 現在のURL:', window.location.href);
        
        setIsLoading(true);
        setQueryError(null);
        
        const res = await fetch(USER_API.USERS, {
          ...API_REQUEST_OPTIONS,
          method: 'GET'
        });
        
        console.log('🔍 ユーザー一覧取得レスポンス:', {
          status: res.status,
          ok: res.ok,
          headers: Object.fromEntries(res.headers.entries())
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❁Eユーザー一覧取得エラー:', errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        
        const userData = await res.json();
        console.log('🔍 ユーザー一覧チE�Eタ:', userData);
        
        if (userData.success && userData.data) {
          setUsers(userData.data);
          setFilteredUsers(userData.data);
        } else {
          console.error('❁E予期しなぁE��ーザーチE�Eタ形弁E', userData);
          throw new Error("ユーザーチE�Eタの形式が不正でぁE);
        }
      } catch (error) {
        console.error('❁Eユーザー一覧取得エラー:', error);
        setQueryError(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // 検索機�E
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => {
      const query = searchQuery.toLowerCase();
      
      // ワイルドカード検索の処琁E
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
      
      // 通常の部刁E��致検索
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

  // エラー表示の追加
  useEffect(() => {
    if (queryError) {
      console.error('ユーザー一覧取得エラー詳細:', queryError);
      
      let errorMessage = "ユーザー一覧の取得に失敗しました";
      if (queryError instanceof Error) {
        errorMessage = queryError.message;
      }
      
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [queryError, toast]);

  // 認証エラーめE��限エラーの場合�E表示
  if (queryError instanceof Error) {
    if (queryError.message.includes('認証が忁E��E) || queryError.message.includes('管琁E��E��陁E)) {
      return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Shield className="mr-2 h-6 w-6" />
                ユーザー管琁E
              </h1>
              <p className="text-neutral-300">シスチE��の全ユーザーを管琁E��まぁE/p>
            </div>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                設定に戻めE
              </Button>
            </Link>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">アクセス権限がありません</h3>
                <p className="text-gray-600 mb-4">
                  {queryError.message.includes('認証が忁E��E) 
                    ? "ログインが忁E��です。�E度ログインしてください、E 
                    : "こ�Eペ�Eジにアクセスするには管琁E��E��限が忁E��です、E}
                </p>
                <Link to="/chat">
                  <Button>
                    チャチE��に戻めE
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // 新規ユーザーフォーム
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

  // フォームの値をリセチE��
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



  // フォーム送信処琁E
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリチE�Eション
    if (!newUser.username || !newUser.password || !newUser.display_name || !newUser.role) {
      toast({
        title: "入力エラー",
        description: "ユーザー名、パスワード、表示名、権限�E忁E��頁E��でぁE,
        variant: "destructive",
      });
      return;
    }

    // ユーザー名�E形式チェチE��
    if (newUser.username.length < 3 || newUser.username.length > 50) {
      toast({
        title: "入力エラー",
        description: "ユーザー名�E3斁E��以丁E0斁E��以下で入力してください",
        variant: "destructive",
      });
      return;
    }

    // パスワード�E強度チェチE��
    if (newUser.password.length < 8) {
      toast({
        title: "パスワードエラー",
        description: "パスワード�E8斁E��以上で設定してください",
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
        title: "パスワードエラー",
        description: "パスワードには大斁E��を1斁E��以上含めてください",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasLowerCase) {
      toast({
        title: "パスワードエラー",
        description: "パスワードには小文字を1斁E��以上含めてください",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasNumbers) {
      toast({
        title: "パスワードエラー",
        description: "パスワードには数字を1斁E��以上含めてください",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasSymbols) {
      toast({
        title: "パスワードエラー",
        description: "パスワードには記号めE斁E��以上含めてください",
        variant: "destructive",
      });
      return;
    }

    // 表示名�E形式チェチE��
    if (newUser.display_name.length < 1 || newUser.display_name.length > 100) {
      toast({
        title: "入力エラー",
        description: "表示名�E1斁E��以丁E00斁E��以下で入力してください",
        variant: "destructive",
      });
      return;
    }

    // 権限�E値チェチE��
    if (!['employee', 'admin'].includes(newUser.role || '')) {
      toast({
        title: "入力エラー",
        description: "権限�E「一般ユーザー」また�E「管琁E��E��を選択してください",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔍 新規ユーザー作�E開姁E', newUser);
      
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
        throw new Error(`ユーザー作�E失敁E ${errorText}`);
      }
      
      const result = await res.json();
      console.log('🔍 ユーザー作�E結果:', result);
      
      if (result.success) {
        console.log('✁Eユーザー作�E成功:', result.data);
        toast({
          title: "成功",
          description: "ユーザーが正常に作�Eされました",
        });
        setShowNewUserDialog(false);
        resetNewUserForm();
        
        // ユーザー一覧を�E取征E
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
                setFilteredUsers(userData.data); // 検索結果も更新
              }
            }
          } catch (error) {
            console.error('ユーザー一覧再取得エラー:', error);
          }
        };
        
        fetchUsers();
      } else {
        throw new Error(result.error || 'ユーザーの作�Eに失敗しました');
      }
    } catch (error) {
      console.error('❁Eユーザー作�Eエラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ユーザーの作�Eに失敗しました",
        variant: "destructive",
      });
    }
  };

  // 入力フィールド更新処琁E
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  // セレクト更新処琁E
  const handleSelectChange = (name: string, value: string) => {
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  // 編雁E��セレクト更新処琁E
  const handleEditSelectChange = (name: string, value: string) => {
    setEditUser((prev) => ({ ...prev, [name]: value }));
  };

  // エクセルファイル選択�E琁E
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイル形式チェチE��
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      const validExtensions = ['.xlsx', '.xls'];
      
      const isValidType = validTypes.includes(file.type) || 
                         validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (!isValidType) {
        toast({
          title: "ファイル形式エラー",
          description: "エクセルファイル�E�Exlsx, .xls�E��EみアチE�Eロード可能でぁE,
          variant: "destructive",
        });
        return;
      }
      
      setImportFile(file);
    }
  };

  // エクセルインポ�Eト�E琁E
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!importFile) {
      toast({
        title: "ファイルエラー",
        description: "エクセルファイルを選択してください",
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
          title: "インポ�Eト完亁E,
          description: `成功: ${result.results.success}件, 失敁E ${result.results.failed}件`,
        });
        
        // ユーザー一覧を�E取征E
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
            console.error('ユーザー一覧再取得エラー:', error);
          }
        };
        
        fetchUsers();
      } else {
        throw new Error(result.error || 'インポ�Eトに失敗しました');
      }
    } catch (error) {
      console.error('エクセルインポ�Eトエラー:', error);
      toast({
        title: "インポ�Eトエラー",
        description: error instanceof Error ? error.message : "インポ�Eト中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // エクセルチE��プレートダウンローチE
  const handleDownloadTemplate = () => {
    const templateData = [
      ['username', 'password', 'display_name', 'role', 'department', 'description'],
      ['user1', 'Password123!', 'ユーザー1', 'employee', '営業部', '一般ユーザー'],
      ['admin1', 'Admin123!', '管琁E��E', 'admin', '管琁E��', 'シスチE��管琁E��E],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    
    XLSX.writeFile(wb, 'user_import_template.xlsx');
  };

  // 編雁E��入力フィールド更新処琁E
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditUser((prev) => ({ ...prev, [name]: value }));
  };

  // ユーザー編雁E��備
  const handleEditUser = (userData: UserData) => {
    setSelectedUserId(userData.id);
    setEditUser({
      id: userData.id, // IDを追加
      username: userData.username,
      display_name: userData.display_name,
      role: userData.role,
      department: userData.department,
      description: userData.description,
      password: "" // パスワードフィールドを空で初期匁E
    });
    setShowEditUserDialog(true);
  };

  // ユーザー削除準備
  const handleDeleteUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowDeleteConfirmDialog(true);
  };

  // ユーザー削除実衁E
  const handleDeleteConfirm = async () => {
    if (!selectedUserId) return;
    
    try {
      // 自刁E�E身のアカウント�E削除できなぁE��ェチE��
      if (user && selectedUserId === user.id) {
        toast({
          title: "削除エラー",
          description: "自刁E�E身のアカウント�E削除できません",
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
        throw new Error(errorData.message || `HTTP ${res.status}: ユーザー削除に失敗しました`);
      }

      const result = await res.json();
      console.log('ユーザー削除結果:', result);
      
      toast({
        title: "削除完亁E,
        description: "ユーザーが削除されました",
      });
      
      setShowDeleteConfirmDialog(false);
      
      // ユーザー一覧を�E取征E
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
              setFilteredUsers(userData.data); // 検索結果も更新
            }
          }
        } catch (error) {
          console.error('ユーザー一覧再取得エラー:', error);
        }
      };
      
      fetchUsers();
      
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
      toast({
        title: "削除失敁E,
        description: error instanceof Error ? error.message : "ユーザー削除中にエラーが発生しました",
        variant: "destructive",
      });
      setShowDeleteConfirmDialog(false);
    }
  };

  // 編雁E��ォーム送信処琁E
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // バリチE�Eション
    if (!editUser.username || !editUser.display_name) {
      toast({
        title: "入力エラー",
        description: "忁E��頁E��を�E力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      // 空のパスワードフィールドを除去して送信
      const sanitizedEditUser = { ...editUser };
      
      // パスワードが空、undefined、null、空白斁E���E場合�E完�Eに除去
      if (!sanitizedEditUser.password || 
          typeof sanitizedEditUser.password !== 'string' || 
          sanitizedEditUser.password.trim().length === 0) {
        delete sanitizedEditUser.password;
        console.log('空のパスワードフィールドを除去しました');
      } else {
        console.log('パスワードフィールドを送信しまぁE);
      }
      
      console.log('送信するユーザーチE�Eタ:', { 
        ...sanitizedEditUser, 
        password: sanitizedEditUser.password ? '[SET]' : '[NOT_SET]' 
      });
      
      console.log('API URL:', `/api/users/${editUser.id}`);
      console.log('リクエスト�EチE��:', JSON.stringify(sanitizedEditUser, null, 2));
      
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedEditUser)
      });
      
      console.log('レスポンススチE�Eタス:', res.status);
      console.log('レスポンスヘッダー:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('エラーレスポンス:', errorText);
        console.error('エラーレスポンスの詳細:', {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          body: errorText
        });
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const result = await res.json();
      console.log('ユーザー更新結果:', result);
      
      toast({
        title: "成功",
        description: "ユーザー惁E��を更新しました",
      });
      
      // ダイアログを閉じてユーザー一覧を�E取征E
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
      
      // ユーザー一覧を�E取征E
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
              setFilteredUsers(userData.data); // 検索結果も更新
            }
          }
        } catch (error) {
          console.error('ユーザー一覧再取得エラー:', error);
        }
      };
      
      fetchUsers();
      
    } catch (error) {
      console.error('ユーザー更新エラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ユーザー更新中にエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  // 管琁E��E��なぁE��合�EローチE��ング表示
  if (!user || (user && user.role !== "admin")) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Shield className="mr-2 h-6 w-6" />
            ユーザー管琁E
          </h1>
          <p className="text-neutral-300">シスチE��の全ユーザーを管琁E��まぁE/p>
        </div>

        <div className="flex space-x-2">
          <Link to="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              設定に戻めE
            </Button>
          </Link>
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                エクセルインポ�EチE
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                新規ユーザー作�E
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規ユーザー作�E</DialogTitle>
                <DialogDescription>
                  新しいユーザーアカウントを作�Eします、E
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">ユーザー吁E/Label>
                    <Input
                      id="username"
                      name="username"
                      value={newUser.username}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">パスワーチE/Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={newUser.password}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-sm text-gray-500">
                      パスワード�E8斁E��以上で、大斁E���E小文字�E数字�E記号をそれぞめE斁E��以上含めてください
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="display_name">表示吁E/Label>
                    <Input
                      id="display_name"
                      name="display_name"
                      value={newUser.display_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="department">部署</Label>
                    <Input
                      id="department"
                      name="department"
                      value={newUser.department || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">説昁E/Label>
                    <Input
                      id="description"
                      name="description"
                      value={newUser.description || ""}
                      onChange={handleInputChange}
                      placeholder="ユーザーの説明（任意！E
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="role">権陁E/Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => handleSelectChange("role", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="権限を選抁E />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">一般ユーザー</SelectItem>
                        <SelectItem value="admin">管琁E��E/SelectItem>
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
                    キャンセル
                  </Button>
                  <Button 
                    type="submit"
                  >
                    作�E
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
              ユーザー一覧
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="ユーザー検索�E�Eでワイルドカード！E
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
                  クリア
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4">読み込み中...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー吁E/TableHead>
                    <TableHead>表示吁E/TableHead>
                    <TableHead>権陁E/TableHead>
                    <TableHead>部署</TableHead>
                    <TableHead>説昁E/TableHead>
                    <TableHead className="text-right">アクション</TableHead>
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
                            {user.role === "admin" ? "管琁E��E : "一般ユーザー"}
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
                        {searchQuery ? "検索条件に一致するユーザーが見つかりません" : "ユーザーが見つかりません"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {searchQuery && (
                <div className="mt-4 text-sm text-gray-500">
                  検索結果: {filteredUsers.length}件 / 全{users.length}件
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ユーザー編雁E��イアログ */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザー編雁E/DialogTitle>
            <DialogDescription>
              ユーザーアカウント情報を編雁E��ます、E
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-username">ユーザー吁E/Label>
                <Input
                  id="edit-username"
                  name="username"
                  value={editUser.username}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-display_name">表示吁E/Label>
                <Input
                  id="edit-display_name"
                  name="display_name"
                  value={editUser.display_name}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-password">新しいパスワード（変更する場合�Eみ�E�E/Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  value={editUser.password || ""}
                  onChange={handleEditInputChange}
                  placeholder="パスワードを変更しなぁE��合�E空欁E�Eまま"
                />
                 <p className="text-sm text-gray-500 mt-1">
                    ※パスワードを変更しなぁE��合�E空のままにしてください
                  </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-department">部署</Label>
                <Input
                  id="edit-department"
                  name="department"
                  value={editUser.department || ""}
                  onChange={handleEditInputChange}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description">説昁E/Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={editUser.description || ""}
                  onChange={handleEditInputChange}
                  placeholder="ユーザーの説明（任意！E
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-role">権陁E/Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => handleEditSelectChange("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="権限を選抁E />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">一般ユーザー</SelectItem>
                    <SelectItem value="admin">管琁E��E/SelectItem>
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
                キャンセル
              </Button>
              <Button 
                type="submit"
              >
                更新
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ユーザー削除確認ダイアログ */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              ユーザー削除の確誁E
            </DialogTitle>
            <DialogDescription>
              こ�Eユーザーを削除すると、E��連するすべてのチE�Eタが削除されます。この操作�E允E��戻せません、E
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <p className="text-center font-medium">本当にこ�Eユーザーを削除しますか�E�E/p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              <p className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>注愁E</strong> チャチE��、メチE��ージ、ドキュメントなど、このユーザーに関連するすべてのチE�Eタが削除されます、E
                  ユーザーがチャチE��めE��キュメントを持ってぁE��場合、それらも同時に削除されます、E
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
              キャンセル
            </Button>
            <Button 
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* エクセルインポ�Eトダイアログ */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              エクセルファイルからユーザー一括インポ�EチE
            </DialogTitle>
            <DialogDescription>
              エクセルファイルからユーザーを一括でインポ�Eトします、E
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* チE��プレートダウンローチE*/}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">チE��プレートファイル</h4>
              <p className="text-sm text-blue-700 mb-3">
                エクセルファイルの形式に合わせてチE��プレートをダウンロードしてください、E
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Download className="mr-2 h-4 w-4" />
                チE��プレートをダウンローチE
              </Button>
            </div>

            {/* ファイルアチE�EローチE*/}
            <form onSubmit={handleImportSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="excel-file">エクセルファイルを選抁E/Label>
                  <Input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    対応形弁E .xlsx, .xls�E�最大5MB�E�E
                  </p>
                </div>

                {importFile && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-700">
                      選択されたファイル: {importFile.name} ({(importFile.size / 1024 / 1024).toFixed(2)}MB)
                    </p>
                  </div>
                )}

                {/* インポ�Eト結果表示 */}
                {importResults && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h4 className="font-medium mb-2">インポ�Eト結果</h4>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-green-600 font-medium">成功: {importResults.success}件</span>
                        {importResults.failed > 0 && (
                          <span className="text-red-600 font-medium ml-4">失敁E {importResults.failed}件</span>
                        )}
                      </p>
                      
                      {importResults.errors && importResults.errors.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-red-600 mb-2">エラー詳細:</p>
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
                    キャンセル
                  </Button>
                  <Button 
                    type="submit"
                    disabled={!importFile || isImporting}
                  >
                    {isImporting ? "インポ�Eト中..." : "インポ�Eト実衁E}
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
