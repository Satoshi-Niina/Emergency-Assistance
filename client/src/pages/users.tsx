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
import { Shield, UserPlus, ArrowLeft, User, Edit, Trash2, AlertCircle, Search, Upload, Download, RefreshCw } from "lucide-react";
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

// 新規ユーザー作成用インターフェース
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

  // ユーザーが未認証の場合はリダイレクト（一般ユーザーでもアクセス可能）
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/chat");
    }
  }, [user, authLoading, navigate]);

  // ユーザーデータの取得（簡素化版）
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [queryError, setQueryError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('🔍 ユーザー一覧取得開始');
        console.log('🔍 現在のユーザー:', user);
        console.log('🔍 セッション状態:', document.cookie);
        console.log('🔍 現在のURL:', window.location.href);
        console.log('🔍 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
        
        setIsLoading(true);
        setQueryError(null);
        
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🔍 ユーザー一覧取得レスポンス:', {
          status: res.status,
          ok: res.ok,
          headers: Object.fromEntries(res.headers.entries())
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ ユーザー一覧取得エラー:', errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        
        const userData = await res.json();
        console.log('🔍 ユーザー一覧データ:', userData);
        
        if (userData.success && userData.data) {
          setUsers(userData.data);
          setFilteredUsers(userData.data);
        } else {
          console.error('❌ 予期しないユーザーデータ形式:', userData);
          throw new Error("ユーザーデータの形式が不正です");
        }
      } catch (error) {
        console.error('❌ ユーザー一覧取得エラー:', error);
        setQueryError(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // 検索機能
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => {
      const query = searchQuery.toLowerCase();
      
      // ワイルドカード検索の処理
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
      
      // 通常の部分一致検索
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

  // エラー表示
  if (queryError instanceof Error) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Shield className="mr-2 h-6 w-6" />
              ユーザー管理
            </h1>
            <p className="text-neutral-300">システムの全ユーザーを管理します</p>
          </div>
          <Link to="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              設定に戻る
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">エラーが発生しました</h3>
              <p className="text-gray-600 mb-4">
                {queryError.message}
              </p>
              <div className="space-x-2">
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  再読み込み
                </Button>
                <Link to="/chat">
                  <Button variant="outline">
                    チャットに戻る
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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

  // フォームの値をリセット
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



  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!newUser.username || !newUser.password || !newUser.display_name || !newUser.role) {
      toast({
        title: "入力エラー",
        description: "ユーザー名、パスワード、表示名、権限は必須項目です",
        variant: "destructive",
      });
      return;
    }

    // ユーザー名の形式チェック
    if (newUser.username.length < 3 || newUser.username.length > 50) {
      toast({
        title: "入力エラー",
        description: "ユーザー名は3文字以上50文字以下で入力してください",
        variant: "destructive",
      });
      return;
    }

    // パスワードの強度チェック
    if (newUser.password.length < 8) {
      toast({
        title: "パスワードエラー",
        description: "パスワードは8文字以上で設定してください",
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
        description: "パスワードには大文字を1文字以上含めてください",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasLowerCase) {
      toast({
        title: "パスワードエラー",
        description: "パスワードには小文字を1文字以上含めてください",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasNumbers) {
      toast({
        title: "パスワードエラー",
        description: "パスワードには数字を1文字以上含めてください",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasSymbols) {
      toast({
        title: "パスワードエラー",
        description: "パスワードには記号を1文字以上含めてください",
        variant: "destructive",
      });
      return;
    }

    // 表示名の形式チェック
    if (newUser.display_name.length < 1 || newUser.display_name.length > 100) {
      toast({
        title: "入力エラー",
        description: "表示名は1文字以上100文字以下で入力してください",
        variant: "destructive",
      });
      return;
    }

    // 権限の値チェック
    if (!['employee', 'admin'].includes(newUser.role || '')) {
      toast({
        title: "入力エラー",
        description: "権限は「一般ユーザー」または「管理者」を選択してください",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔍 新規ユーザー作成開始:', newUser);
      
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
        throw new Error(`ユーザー作成失敗: ${errorText}`);
      }
      
      const result = await res.json();
      console.log('🔍 ユーザー作成結果:', result);
      
      if (result.success) {
        console.log('✅ ユーザー作成成功:', result.data);
        toast({
          title: "成功",
          description: "ユーザーが正常に作成されました",
        });
        setShowNewUserDialog(false);
        resetNewUserForm();
        
        // ユーザー一覧を再取得
        const fetchUsers = async () => {
          try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users`, {
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
        throw new Error(result.error || 'ユーザーの作成に失敗しました');
      }
    } catch (error) {
      console.error('❌ ユーザー作成エラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ユーザーの作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  // 入力フィールド更新処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  // セレクト更新処理
  const handleSelectChange = (name: string, value: string) => {
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  // 編集用セレクト更新処理
  const handleEditSelectChange = (name: string, value: string) => {
    setEditUser((prev) => ({ ...prev, [name]: value }));
  };

  // エクセルファイル選択処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイル形式チェック
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
          description: "エクセルファイル（.xlsx, .xls）のみアップロード可能です",
          variant: "destructive",
        });
        return;
      }
      
      setImportFile(file);
    }
  };

  // エクセルインポート処理
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
          title: "インポート完了",
          description: `成功: ${result.results.success}件, 失敗: ${result.results.failed}件`,
        });
        
        // ユーザー一覧を再取得
        const fetchUsers = async () => {
          try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users`, {
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
        throw new Error(result.error || 'インポートに失敗しました');
      }
    } catch (error) {
      console.error('エクセルインポートエラー:', error);
      toast({
        title: "インポートエラー",
        description: error instanceof Error ? error.message : "インポート中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // エクセルテンプレートダウンロード
  const handleDownloadTemplate = () => {
    const templateData = [
      ['username', 'password', 'display_name', 'role', 'department', 'description'],
      ['user1', 'Password123!', 'ユーザー1', 'employee', '営業部', '一般ユーザー'],
      ['admin1', 'Admin123!', '管理者1', 'admin', '管理部', 'システム管理者'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    
    XLSX.writeFile(wb, 'user_import_template.xlsx');
  };

  // 編集用入力フィールド更新処理
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditUser((prev) => ({ ...prev, [name]: value }));
  };

  // ユーザー編集準備
  const handleEditUser = (userData: UserData) => {
    setSelectedUserId(userData.id);
    setEditUser({
      id: userData.id, // IDを追加
      username: userData.username,
      display_name: userData.display_name,
      role: userData.role,
      department: userData.department,
      description: userData.description,
      password: "" // パスワードフィールドを空で初期化
    });
    setShowEditUserDialog(true);
  };

  // ユーザー削除準備
  const handleDeleteUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowDeleteConfirmDialog(true);
  };

  // ユーザー削除実行
  const handleDeleteConfirm = async () => {
    if (!selectedUserId) return;
    
    try {
      // 自分自身のアカウントは削除できないチェック
      if (user && selectedUserId === user.id) {
        toast({
          title: "削除エラー",
          description: "自分自身のアカウントは削除できません",
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
        title: "削除完了",
        description: "ユーザーが削除されました",
      });
      
      setShowDeleteConfirmDialog(false);
      
      // ユーザー一覧を再取得
      const fetchUsers = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users`, {
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
        title: "削除失敗",
        description: error instanceof Error ? error.message : "ユーザー削除中にエラーが発生しました",
        variant: "destructive",
      });
      setShowDeleteConfirmDialog(false);
    }
  };

  // 編集フォーム送信処理
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // バリデーション
    if (!editUser.username || !editUser.display_name) {
      toast({
        title: "入力エラー",
        description: "必須項目を入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      // 空のパスワードフィールドを除去して送信
      const sanitizedEditUser = { ...editUser };
      
      // パスワードが空、undefined、null、空白文字の場合は完全に除去
      if (!sanitizedEditUser.password || 
          typeof sanitizedEditUser.password !== 'string' || 
          sanitizedEditUser.password.trim().length === 0) {
        delete sanitizedEditUser.password;
        console.log('空のパスワードフィールドを除去しました');
      } else {
        console.log('パスワードフィールドを送信します');
      }
      
      console.log('送信するユーザーデータ:', { 
        ...sanitizedEditUser, 
        password: sanitizedEditUser.password ? '[SET]' : '[NOT_SET]' 
      });
      
      console.log('API URL:', `/api/users/${editUser.id}`);
      console.log('リクエストボディ:', JSON.stringify(sanitizedEditUser, null, 2));
      
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedEditUser)
      });
      
      console.log('レスポンスステータス:', res.status);
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
        description: "ユーザー情報を更新しました",
      });
      
      // ダイアログを閉じてユーザー一覧を再取得
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
      
      // ユーザー一覧を再取得
      const fetchUsers = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users`, {
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

  // 管理者でない場合のローディング表示
  if (!user || (user && user.role !== "admin")) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Shield className="mr-2 h-6 w-6" />
            ユーザー管理
          </h1>
          <p className="text-neutral-300">システムの全ユーザーを管理します</p>
        </div>

        <div className="flex space-x-2">
          <Link to="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              設定に戻る
            </Button>
          </Link>
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                エクセルインポート
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                新規ユーザー作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規ユーザー作成</DialogTitle>
                <DialogDescription>
                  新しいユーザーアカウントを作成します。
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">ユーザー名</Label>
                    <Input
                      id="username"
                      name="username"
                      value={newUser.username}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">パスワード</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={newUser.password}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-sm text-gray-500">
                      パスワードは8文字以上で、大文字・小文字・数字・記号をそれぞれ1文字以上含めてください
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="display_name">表示名</Label>
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
                    <Label htmlFor="description">説明</Label>
                    <Input
                      id="description"
                      name="description"
                      value={newUser.description || ""}
                      onChange={handleInputChange}
                      placeholder="ユーザーの説明（任意）"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="role">権限</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => handleSelectChange("role", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="権限を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">一般ユーザー</SelectItem>
                        <SelectItem value="admin">管理者</SelectItem>
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
                    作成
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
                  placeholder="ユーザー検索（*でワイルドカード）"
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
            <div className="flex flex-col items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-600">ユーザー一覧を読み込み中...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー名</TableHead>
                    <TableHead>表示名</TableHead>
                    <TableHead>権限</TableHead>
                    <TableHead>部署</TableHead>
                    <TableHead>説明</TableHead>
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
                            {user.role === "admin" ? "管理者" : "一般ユーザー"}
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

      {/* ユーザー編集ダイアログ */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザー編集</DialogTitle>
            <DialogDescription>
              ユーザーアカウント情報を編集します。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-username">ユーザー名</Label>
                <Input
                  id="edit-username"
                  name="username"
                  value={editUser.username}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-display_name">表示名</Label>
                <Input
                  id="edit-display_name"
                  name="display_name"
                  value={editUser.display_name}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-password">新しいパスワード（変更する場合のみ）</Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  value={editUser.password || ""}
                  onChange={handleEditInputChange}
                  placeholder="パスワードを変更しない場合は空欄のまま"
                />
                 <p className="text-sm text-gray-500 mt-1">
                    ※パスワードを変更しない場合は空のままにしてください
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
                <Label htmlFor="edit-description">説明</Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={editUser.description || ""}
                  onChange={handleEditInputChange}
                  placeholder="ユーザーの説明（任意）"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-role">権限</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => handleEditSelectChange("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="権限を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">一般ユーザー</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
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
              ユーザー削除の確認
            </DialogTitle>
            <DialogDescription>
              このユーザーを削除すると、関連するすべてのデータが削除されます。この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <p className="text-center font-medium">本当にこのユーザーを削除しますか？</p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              <p className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>注意:</strong> チャット、メッセージ、ドキュメントなど、このユーザーに関連するすべてのデータが削除されます。
                  ユーザーがチャットやドキュメントを持っている場合、それらも同時に削除されます。
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

      {/* エクセルインポートダイアログ */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              エクセルファイルからユーザー一括インポート
            </DialogTitle>
            <DialogDescription>
              エクセルファイルからユーザーを一括でインポートします。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* テンプレートダウンロード */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">テンプレートファイル</h4>
              <p className="text-sm text-blue-700 mb-3">
                エクセルファイルの形式に合わせてテンプレートをダウンロードしてください。
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Download className="mr-2 h-4 w-4" />
                テンプレートをダウンロード
              </Button>
            </div>

            {/* ファイルアップロード */}
            <form onSubmit={handleImportSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="excel-file">エクセルファイルを選択</Label>
                  <Input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    対応形式: .xlsx, .xls（最大5MB）
                  </p>
                </div>

                {importFile && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-700">
                      選択されたファイル: {importFile.name} ({(importFile.size / 1024 / 1024).toFixed(2)}MB)
                    </p>
                  </div>
                )}

                {/* インポート結果表示 */}
                {importResults && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h4 className="font-medium mb-2">インポート結果</h4>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="text-green-600 font-medium">成功: {importResults.success}件</span>
                        {importResults.failed > 0 && (
                          <span className="text-red-600 font-medium ml-4">失敗: {importResults.failed}件</span>
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
                    {isImporting ? "インポート中..." : "インポート実行"}
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